import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function normalize(value) {
  return String(value || "").trim();
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export class SetupGuardService {
  constructor({ token = "", tokenPath = "" } = {}) {
    this.configuredToken = normalize(token);
    this.generated = !this.configuredToken;
    this.token = this.configuredToken || randomBytes(18).toString("base64url");
    this.tokenPath = normalize(tokenPath);
  }

  verify(token = "") {
    const normalized = normalize(token);

    return Boolean(normalized && safeEqual(normalized, this.token));
  }

  mask() {
    return `${this.token.slice(0, 4)}...${this.token.slice(-4)}`;
  }

  persistForInitialSetup() {
    if (!this.generated || !this.tokenPath) {
      return false;
    }

    mkdirSync(dirname(this.tokenPath), { recursive: true });
    writeFileSync(this.tokenPath, `${this.token}\n`, { encoding: "utf8", mode: 0o600 });

    return true;
  }

  cleanupInitialSetupToken() {
    if (!this.generated || !this.tokenPath || !existsSync(this.tokenPath)) {
      return false;
    }

    rmSync(this.tokenPath, { force: true });

    return true;
  }
}
