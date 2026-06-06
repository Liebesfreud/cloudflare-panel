import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

function normalize(value) {
  return String(value || "").trim();
}

export class PersistentSecretService {
  constructor({ secretPath }) {
    this.secretPath = secretPath;
  }

  readOrCreate() {
    if (existsSync(this.secretPath)) {
      const existing = normalize(readFileSync(this.secretPath, "utf8"));

      if (existing.length >= 32) {
        return existing;
      }
    }

    mkdirSync(dirname(this.secretPath), { recursive: true });
    const secret = randomBytes(32).toString("base64url");
    writeFileSync(this.secretPath, `${secret}\n`, { encoding: "utf8", mode: 0o600 });

    return secret;
  }
}
