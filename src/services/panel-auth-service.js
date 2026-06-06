import { createHmac, timingSafeEqual } from "node:crypto";

const defaultTotpWindow = 1;
const totpStepSeconds = 30;

function normalizeString(value) {
  return String(value || "").trim();
}

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = normalizeString(input)
    .toUpperCase()
    .replace(/[\s=-]/g, "");
  const bytes = [];
  let bits = 0;
  let value = 0;

  for (const char of normalized) {
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

function hotp(secret, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyTotp(token, secret, { now = Date.now(), window = defaultTotpWindow } = {}) {
  const normalizedToken = normalizeString(token).replace(/\s+/g, "");
  const normalizedSecret = normalizeString(secret);

  if (!/^\d{6}$/.test(normalizedToken) || !normalizedSecret) {
    return false;
  }

  let secretBuffer;

  try {
    secretBuffer = base32Decode(normalizedSecret);
  } catch {
    return false;
  }

  const currentCounter = Math.floor(now / 1000 / totpStepSeconds);

  for (let offset = -window; offset <= window; offset += 1) {
    if (safeEqual(hotp(secretBuffer, currentCounter + offset), normalizedToken)) {
      return true;
    }
  }

  return false;
}

export class PanelAuthService {
  constructor({ authSecret = "", password = "", user = "" } = {}) {
    this.authSecret = normalizeString(authSecret);
    this.password = normalizeString(password);
    this.user = normalizeString(user);
  }

  isConfigured() {
    return Boolean(this.user && this.password && this.authSecret);
  }

  verify({ auth = "", password = "", user = "" } = {}) {
    if (!this.isConfigured()) {
      return false;
    }

    return (
      safeEqual(normalizeString(user), this.user) &&
      safeEqual(normalizeString(password), this.password) &&
      verifyTotp(auth, this.authSecret)
    );
  }
}
