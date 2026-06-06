import { randomBytes, timingSafeEqual } from "node:crypto";

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
  constructor({ token = "" } = {}) {
    this.token = normalize(token) || randomBytes(18).toString("base64url");
  }

  verify(token = "") {
    const normalized = normalize(token);

    return Boolean(normalized && safeEqual(normalized, this.token));
  }

  mask() {
    return `${this.token.slice(0, 4)}...${this.token.slice(-4)}`;
  }
}
