import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SqliteStore } from "../../src/services/sqlite-store.js";

const defaultTotpSecret = "JBSWY3DPEHPK3PXP";
const defaultPassword = "strong-password";
const originalFetch = global.fetch.bind(global);
const panels = new Map();

let fetchInstalled = false;

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = [];
  let bits = 0;
  let value = 0;

  for (const char of String(input).toUpperCase().replace(/[\s=-]/g, "")) {
    const index = alphabet.indexOf(char);

    if (index === -1) {
      throw new Error("Invalid base32 character");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function makeTotp(secret, now = Date.now()) {
  const counter = Math.floor(now / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

export async function allocatePanelPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      server.close(() => resolve(port));
    });
  });
}

function readAccount(env, index) {
  const email = String(env[`EMAIL${index}`] || "").trim();
  const globalApiKey = String(env[`CF_API${index}`] || "").trim();

  if (!email || !globalApiKey) {
    return null;
  }

  return {
    email,
    globalApiKey,
    name: String(env[`CF_NAME${index}`] || "").trim() || `Cloudflare ${index}`,
  };
}

function collectAccounts(env) {
  const accounts = [];
  const indexes = Object.keys(env)
    .map((key) => key.match(/^EMAIL(?<index>\d+)$/)?.groups?.index)
    .filter(Boolean)
    .map(Number)
    .sort((left, right) => left - right);

  for (const index of indexes) {
    const account = readAccount(env, index);

    if (account) {
      accounts.push(account);
    }
  }

  const legacyEmail = String(env.CLOUDFLARE_EMAIL || env.CF_EMAIL || "").trim();
  const legacyGlobalApiKey = String(
    env.CLOUDFLARE_GLOBAL_API_KEY ||
      env.CF_GLOBAL_API_KEY ||
      env.CLOUDFLARE_API_KEY ||
      env.CF_API_KEY ||
      ""
  ).trim();

  if (legacyEmail && legacyGlobalApiKey && !accounts.length) {
    accounts.push({
      email: legacyEmail,
      globalApiKey: legacyGlobalApiKey,
      name: String(env.CF_NAME || "").trim() || "Cloudflare 1",
    });
  }

  return accounts.length
    ? accounts
    : [{ email: "admin@example.com", globalApiKey: "test-global-api-key", name: "Cloudflare 1" }];
}

function clearSensitiveEnv(env) {
  const sanitized = { ...env };
  const sensitivePatterns = [
    /^AUTH$/,
    /^PASSWORD$/,
    /^USER$/,
    /^EMAIL\d+$/,
    /^CF_API\d+$/,
    /^CF_NAME\d+$/,
    /^CLOUDFLARE_EMAIL$/,
    /^CLOUDFLARE_GLOBAL_API_KEY$/,
    /^CLOUDFLARE_API_KEY$/,
    /^CF_EMAIL$/,
    /^CF_GLOBAL_API_KEY$/,
    /^CF_API_KEY$/,
    /^CF_NAME$/,
  ];

  for (const key of Object.keys(sanitized)) {
    if (sensitivePatterns.some((pattern) => pattern.test(key))) {
      sanitized[key] = "";
    }
  }

  return sanitized;
}

function getPanelFromUrl(url) {
  let parsed;

  try {
    parsed = new URL(String(url));
  } catch {
    return null;
  }

  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    return null;
  }

  return panels.get(Number(parsed.port));
}

function hasCookie(options = {}) {
  const headers = new Headers(options.headers || {});
  return Boolean(headers.get("cookie"));
}

function withCookie(options = {}, cookie) {
  const headers = new Headers(options.headers || {});
  headers.set("Cookie", cookie);

  return {
    ...options,
    headers,
  };
}

function withPanelAuth(options = {}, panel) {
  const headers = new Headers(options.headers || {});
  headers.set("Cookie", panel.cookie);

  if (panel.csrfToken && !["GET", "HEAD", "OPTIONS"].includes(String(options.method || "GET").toUpperCase())) {
    headers.set("X-CSRF-Token", panel.csrfToken);
  }

  return {
    ...options,
    headers,
  };
}

function shouldAuthenticate(url, options = {}) {
  const headers = new Headers(options.headers || {});

  if (headers.get("x-panel-test-skip-auth") === "true") {
    return false;
  }

  let parsed;

  try {
    parsed = new URL(String(url));
  } catch {
    return false;
  }

  if (!parsed.pathname.startsWith("/api/") || parsed.pathname.startsWith("/api/setup/")) {
    return false;
  }

  if (parsed.pathname === "/api/session/status" || parsed.pathname === "/api/session/connect") {
    return false;
  }

  return !hasCookie(options);
}

function shouldPrepareOnly(url, options = {}) {
  const headers = new Headers(options.headers || {});

  if (headers.get("x-panel-test-prepare") !== "true") {
    return false;
  }

  return Boolean(getPanelFromUrl(url));
}

async function readJson(response, fallback) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || fallback);
  }

  return payload || {};
}

async function ensureSetup(panel) {
  if (panel.cookie) {
    return panel.cookie;
  }

  if (!panel.setupPromise) {
    panel.setupPromise = (async () => {
      const origin = `http://127.0.0.1:${panel.port}`;
      const secretResponse = await originalFetch(`${origin}/api/setup/secret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: panel.setupToken }),
      });
      const secretPayload = await readJson(secretResponse, "setup secret failed");
      const setupSecret = panel.totpSecret || secretPayload.secret;
      const firstAccount = panel.accounts[0];
      const adminResponse = await originalFetch(`${origin}/api/setup/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: panel.password,
          setupToken: panel.setupToken,
          totpCode: makeTotp(setupSecret),
          totpSecret: setupSecret,
          username: panel.username,
        }),
      });
      const adminPayload = await readJson(adminResponse, "admin setup failed");

      panel.cookie = adminResponse.headers.get("set-cookie")?.split(";")[0] || "";
      panel.csrfToken = adminPayload.csrfToken || "";

      if (!panel.cookie) {
        throw new Error("setup did not return a session cookie");
      }

      const accountsResponse = await originalFetch(`${origin}/api/setup/cloudflare-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: panel.cookie,
          "X-CSRF-Token": panel.csrfToken,
        },
        body: JSON.stringify({
          accounts: [
            {
              cfApiKey: firstAccount.globalApiKey,
              cfEmail: firstAccount.email,
              cloudflareName: firstAccount.name,
            },
          ],
        }),
      });
      const accountsPayload = await readJson(accountsResponse, "cloudflare account setup failed");
      panel.csrfToken = accountsPayload.csrfToken || panel.csrfToken;

      if (panel.accounts.length > 1) {
        const store = new SqliteStore({
          databasePath: panel.databasePath,
          secretKey: readFileSync(panel.secretPath, "utf8").trim(),
        });

        try {
          for (const account of panel.accounts.slice(1)) {
            store.createCloudflareAccount(account);
          }
        } finally {
          store.close();
        }
      }

      return panel.cookie;
    })();
  }

  return panel.setupPromise;
}

function installFetch() {
  if (fetchInstalled) {
    return;
  }

  global.fetch = async (url, options = {}) => {
    const panel = getPanelFromUrl(url);

    if (panel && shouldPrepareOnly(url, options)) {
      await ensureSetup(panel);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
        status: 200,
      });
    }

    if (!panel || !shouldAuthenticate(url, options)) {
      return originalFetch(url, options);
    }

    await ensureSetup(panel);
    return originalFetch(url, withPanelAuth(options, panel));
  };

  fetchInstalled = true;
}

export function preparePanelTestEnvironment(env = {}) {
  installFetch();

  const port = Number(env.PORT);

  if (!Number.isInteger(port) || port < 0) {
    throw new Error("preparePanelTestEnvironment requires an explicit numeric PORT");
  }

  const dataDir = mkdtempSync(join(tmpdir(), "cf-panel-test-"));
  const databasePath = env.SQLITE_PATH || join(dataDir, "panel.sqlite");
  const secretPath = env.SECRET_KEY_PATH || join(dataDir, "secret.key");
  const panel = {
    accounts: collectAccounts(env),
    cookie: "",
    csrfToken: "",
    dataDir,
    databasePath,
    password: String(env.PASSWORD || defaultPassword),
    port,
    secretPath,
    setupToken: String(env.SETUP_TOKEN || "test-setup-token"),
    setupPromise: null,
    totpSecret: String(env.AUTH || ""),
    username: String(env.USER || "operator"),
  };

  panels.set(port, panel);

  return {
    cleanup() {
      panels.delete(port);
      rmSync(dataDir, { force: true, recursive: true });
    },
    registerPort(actualPort) {
      const normalizedActualPort = Number(actualPort);

      if (
        Number.isInteger(normalizedActualPort) &&
        normalizedActualPort > 0 &&
        normalizedActualPort !== port
      ) {
        panels.set(normalizedActualPort, panel);
      }

      return normalizedActualPort;
    },
    env: {
      ...clearSensitiveEnv(env),
      CF_PANEL_SKIP_DOTENV: "true",
      SETUP_TOKEN: panel.setupToken,
      SECRET_KEY_PATH: secretPath,
      SQLITE_PATH: databasePath,
    },
  };
}
