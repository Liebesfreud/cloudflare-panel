import { readFileSync } from "node:fs";
import { join } from "node:path";

import { projectRoot } from "./paths.js";

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535 ? parsed : fallback;
}

function localEnvKeys(env) {
  return new Set(
    String(env.CF_PANEL_LOCAL_ENV_KEYS || "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean)
  );
}

function resolvePanelAuth(env) {
  const keys = localEnvKeys(env);
  const hasLocalAuthFragment = ["USER", "PASSWORD", "AUTH"].some((key) => keys.has(key));

  return {
    authSecret: hasLocalAuthFragment && !keys.has("AUTH") ? "" : env.AUTH || "",
    password: hasLocalAuthFragment && !keys.has("PASSWORD") ? "" : env.PASSWORD || "",
    user: hasLocalAuthFragment && !keys.has("USER") ? "" : env.USER || "",
  };
}

function collectCloudflareAccounts(env) {
  const accounts = [];
  const seen = new Set();

  for (const [key] of Object.entries(env)) {
    const match = key.match(/^EMAIL(?<index>\d+)$/);

    if (!match) {
      continue;
    }

    const index = match.groups.index;
    const email = String(env[`EMAIL${index}`] || "").trim();
    const globalApiKey = String(env[`CF_API${index}`] || "").trim();

    if (!email || !globalApiKey) {
      continue;
    }

    const id = `cf${index}`;
    seen.add(id);
    accounts.push({
      email,
      globalApiKey,
      id,
      name: String(env[`CF_NAME${index}`] || "").trim() || `Cloudflare ${index}`,
      source: "env",
    });
  }

  accounts.sort((left, right) => Number(left.id.slice(2)) - Number(right.id.slice(2)));

  const legacyEmail = String(env.CLOUDFLARE_EMAIL || env.CF_EMAIL || "").trim();
  const legacyGlobalApiKey = String(
    env.CLOUDFLARE_GLOBAL_API_KEY ||
      env.CF_GLOBAL_API_KEY ||
      env.CLOUDFLARE_API_KEY ||
      env.CF_API_KEY ||
      ""
  ).trim();

  if (legacyEmail && legacyGlobalApiKey && !seen.has("cf1")) {
    accounts.unshift({
      email: legacyEmail,
      globalApiKey: legacyGlobalApiKey,
      id: "cf1",
      name: String(env.CF_NAME || "").trim() || "Cloudflare 1",
      source: "env",
    });
  }

  return accounts;
}

function shouldSetLocalEnvValue(key, env, override) {
  return override || env[key] === undefined || (key === "USER" && !localEnvKeys(env).has("USER"));
}

export function loadLocalEnv(env = process.env, { override = false } = {}) {
  if (env.CF_PANEL_SKIP_DOTENV === "true") {
    return;
  }

  const envPath = join(projectRoot, ".env");

  try {
    const envFile = readFileSync(envPath, "utf8");
    const loadedKeys = localEnvKeys(env);

    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2");

      if (key && shouldSetLocalEnvValue(key, env, override)) {
        env[key] = value;
      }

      if (key) {
        loadedKeys.add(key);
      }
    }

    if (loadedKeys.size) {
      env.CF_PANEL_LOCAL_ENV_KEYS = [...loadedKeys].join(",");
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Unable to read .env: ${error.message}`);
    }
  }
}

export function createConfig(env = process.env) {
  const cloudflareAccounts = collectCloudflareAccounts(env);
  const defaultCloudflareAccount = cloudflareAccounts[0] || {};
  const auth = resolvePanelAuth(env);

  return {
    auth,
    server: {
      port: parsePort(env.PORT, 3000),
      secureCookies: env.NODE_ENV === "production" || env.SECURE_COOKIES === "true",
    },
    cloudflare: {
      accounts: cloudflareAccounts,
      apiBaseUrl: env.CLOUDFLARE_API_BASE_URL || "https://api.cloudflare.com/client/v4",
      email: defaultCloudflareAccount.email || "",
      globalApiKey: defaultCloudflareAccount.globalApiKey || "",
      requestTimeoutMs: parsePositiveNumber(env.CLOUDFLARE_REQUEST_TIMEOUT_MS, 15_000),
      zonesPerPage: 50,
    },
    session: {
      ttlDays: parsePositiveNumber(env.SESSION_TTL_DAYS, 30),
    },
  };
}
