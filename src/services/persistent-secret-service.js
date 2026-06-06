import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

function normalize(value) {
  return String(value || "").trim();
}

export class PersistentSecretService {
  constructor({ externalSecret = "", externalSecretPath = "", secretPath }) {
    this.externalSecret = normalize(externalSecret);
    this.externalSecretPath = normalize(externalSecretPath);
    this.secretPath = secretPath;
  }

  readOrCreate() {
    if (this.externalSecret.length >= 32) {
      return this.externalSecret;
    }

    if (this.externalSecretPath) {
      const existing = this.readSecretFile(this.externalSecretPath);

      if (existing.length >= 32) {
        return existing;
      }

      throw new Error("PANEL_SECRET_KEY_FILE 指向的密钥文件不存在或长度不足 32 字符");
    }

    const existing = this.readSecretFile(this.secretPath);

    if (existing.length >= 32) {
      return existing;
    }

    return this.createLocalSecret();
  }

  createLocalSecret() {
    mkdirSync(dirname(this.secretPath), { recursive: true });
    const secret = randomBytes(32).toString("base64url");
    writeFileSync(this.secretPath, `${secret}\n`, { encoding: "utf8", mode: 0o600 });

    return secret;
  }

  readSecretFile(path) {
    if (!path || !existsSync(path)) {
      return "";
    }

    return normalize(readFileSync(path, "utf8"));
  }
}
