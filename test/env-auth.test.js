import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";

import { createConfig } from "../src/config/env.js";
import { PanelAuthService } from "../src/services/panel-auth-service.js";

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

function makeTotp(secret, now = Date.now()) {
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

test("createConfig collects numbered Cloudflare account environment variables in order", () => {
  const config = createConfig({
    AUTH: "JBSWY3DPEHPK3PXP",
    CF_API1: "first-key",
    CF_API2: "second-key",
    CF_API10: "tenth-key",
    CF_NAME2: "备用账号",
    EMAIL1: "first@example.com",
    EMAIL2: "second@example.com",
    EMAIL10: "tenth@example.com",
    PASSWORD: "panel-password",
    USER: "panel-user",
  });

  assert.deepEqual(
    config.cloudflare.accounts.map((account) => [account.id, account.email, account.globalApiKey, account.name]),
    [
      ["cf1", "first@example.com", "first-key", "Cloudflare 1"],
      ["cf2", "second@example.com", "second-key", "备用账号"],
      ["cf10", "tenth@example.com", "tenth-key", "Cloudflare 10"],
    ]
  );
  assert.equal(config.cloudflare.email, "first@example.com");
  assert.equal(config.cloudflare.globalApiKey, "first-key");
  assert.deepEqual(config.auth, {
    authSecret: "JBSWY3DPEHPK3PXP",
    password: "panel-password",
    user: "panel-user",
  });
});

test("createConfig does not treat inherited shell USER as configured panel login", () => {
  const config = createConfig({
    AUTH: "",
    CF_PANEL_LOCAL_ENV_KEYS: "PASSWORD,AUTH",
    PASSWORD: "panel-password",
    USER: "shell-user",
  });

  assert.equal(config.auth.user, "");
  assert.equal(config.auth.password, "panel-password");
  assert.equal(config.auth.authSecret, "");
});

test("PanelAuthService verifies TOTP login without accepting wrong credentials", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const service = new PanelAuthService({
    authSecret: secret,
    password: "panel-password",
    user: "panel-user",
  });

  assert.equal(
    service.verify({
      auth: makeTotp(secret),
      password: "panel-password",
      user: "panel-user",
    }),
    true
  );
  assert.equal(
    service.verify({
      auth: makeTotp(secret),
      password: "wrong-password",
      user: "panel-user",
    }),
    false
  );
});
