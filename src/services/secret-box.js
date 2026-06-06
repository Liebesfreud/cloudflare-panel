import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const encryptedPrefix = "enc:v1:";
const keyLength = 32;
const ivLength = 12;
const tagLength = 16;

function normalize(value) {
  return String(value || "");
}

function deriveKey(secret = "") {
  return createHash("sha256").update(normalize(secret)).digest().subarray(0, keyLength);
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

export class SecretBox {
  constructor({ keyMaterial = "" } = {}) {
    this.key = deriveKey(keyMaterial);
  }

  isEncrypted(value = "") {
    return normalize(value).startsWith(encryptedPrefix);
  }

  encrypt(plainText = "") {
    const iv = randomBytes(ivLength);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(normalize(plainText), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${encryptedPrefix}${[
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".")}`;
  }

  decrypt(value = "") {
    const normalized = normalize(value);

    if (!this.isEncrypted(normalized)) {
      return normalized;
    }

    const [ivValue, tagValue, encryptedValue] = normalized.slice(encryptedPrefix.length).split(".");

    if (!ivValue || !tagValue || !encryptedValue) {
      throw new Error("敏感字段密文格式无效");
    }

    const decipher = createDecipheriv("aes-256-gcm", this.key, decodeBase64Url(ivValue));
    decipher.setAuthTag(decodeBase64Url(tagValue).subarray(0, tagLength));

    return Buffer.concat([
      decipher.update(decodeBase64Url(encryptedValue)),
      decipher.final(),
    ]).toString("utf8");
  }
}
