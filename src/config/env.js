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

export function loadLocalEnv(env = process.env) {
  const envPath = join(projectRoot, ".env");

  try {
    const envFile = readFileSync(envPath, "utf8");

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

      if (key && env[key] === undefined) {
        env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Unable to read .env: ${error.message}`);
    }
  }
}

export function createConfig(env = process.env) {
  return {
    server: {
      port: parsePort(env.PORT, 3000),
    },
    cloudflare: {
      apiBaseUrl: env.CLOUDFLARE_API_BASE_URL || "https://api.cloudflare.com/client/v4",
      email: env.CLOUDFLARE_EMAIL || env.CF_EMAIL || "",
      globalApiKey:
        env.CLOUDFLARE_GLOBAL_API_KEY ||
        env.CF_GLOBAL_API_KEY ||
        env.CLOUDFLARE_API_KEY ||
        env.CF_API_KEY ||
        "",
      requestTimeoutMs: parsePositiveNumber(env.CLOUDFLARE_REQUEST_TIMEOUT_MS, 15_000),
      zonesPerPage: 50,
    },
  };
}
