import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import { createConfig } from "../src/config/env.js";
import { PanelAuthService, generateTotpSecret } from "../src/services/panel-auth-service.js";
import { SqliteStore } from "../src/services/sqlite-store.js";
import { makeTotp } from "./helpers/panel-test-environment.js";

async function withStore(callback) {
  const dir = await mkdtemp(join(tmpdir(), "cf-panel-auth-"));
  const store = new SqliteStore({ databasePath: join(dir, "panel.sqlite") });

  try {
    return await callback(store);
  } finally {
    store.close();
    await rm(dir, { force: true, recursive: true });
  }
}

test("createConfig keeps sensitive account material out of environment parsing", () => {
  const config = createConfig({
    AUTH: "JBSWY3DPEHPK3PXP",
    CF_API1: "first-key",
    DATA_DIR: "/var/lib/network",
    EMAIL1: "first@example.com",
    PASSWORD: "panel-password",
    PORT: "3100",
    USER: "panel-user",
  });

  assert.equal(config.server.port, 3100);
  assert.equal(config.database.path, "/var/lib/network/panel.sqlite");
  assert.equal(Object.hasOwn(config, "auth"), false);
  assert.equal(Object.hasOwn(config.cloudflare, "accounts"), false);
  assert.equal(Object.hasOwn(config.cloudflare, "email"), false);
  assert.equal(Object.hasOwn(config.cloudflare, "globalApiKey"), false);
});

test("PanelAuthService creates SQLite setup and verifies TOTP login", async () => {
  await withStore((store) => {
    const secret = generateTotpSecret();
    const service = new PanelAuthService({ store });
    const result = service.createSetup({
      cfApiKey: "global-key-for-sqlite-storage",
      cfEmail: "first@example.com",
      cloudflareName: "主账号",
      password: "panel-password",
      totpCode: makeTotp(secret),
      totpSecret: secret,
      username: "operator",
    });

    assert.equal(result.statusCode, 201);
    const rawPanelUser = store.database.prepare("SELECT totp_secret FROM panel_user WHERE id = 1").get();
    const rawAccount = store.database.prepare("SELECT global_api_key FROM cloudflare_accounts LIMIT 1").get();

    assert.match(rawPanelUser.totp_secret, /^enc:v1:/);
    assert.match(rawAccount.global_api_key, /^enc:v1:/);
    assert.notEqual(rawPanelUser.totp_secret, secret.replace(/\s+/g, ""));
    assert.notEqual(rawAccount.global_api_key, "global-key-for-sqlite-storage");
    assert.equal(service.isConfigured(), true);
    assert.equal(store.hasCloudflareAccounts(), true);
    assert.equal(store.getCloudflareAccount().email, "first@example.com");
    assert.equal(store.getCloudflareAccount().globalApiKey, "global-key-for-sqlite-storage");
    assert.equal(
      service.verify({
        auth: makeTotp(secret),
        password: "panel-password",
        user: "operator",
      }),
      true
    );
    assert.equal(
      service.verify({
        auth: makeTotp(secret),
        password: "wrong-password",
        user: "operator",
      }),
      false
    );
  });
});

test("PanelAuthService ignores empty preset Cloudflare account rows during setup", async () => {
  await withStore((store) => {
    const secret = generateTotpSecret();
    const service = new PanelAuthService({ store });
    const userResult = service.createPanelUserSetup({
      password: "panel-password",
      totpCode: makeTotp(secret),
      totpSecret: secret,
      username: "operator",
    });
    const accountResult = service.createCloudflareAccountsSetup({
      accounts: [
        {
          cfApiKey: "global-key-for-sqlite-storage",
          cfEmail: "first@example.com",
          cloudflareName: "主账号",
        },
        {
          cfApiKey: "",
          cfEmail: "",
          cloudflareName: "备用账号",
        },
      ],
    });

    assert.equal(userResult.statusCode, 201);
    assert.equal(accountResult.statusCode, 201);
    assert.equal(accountResult.accounts.length, 1);
    assert.equal(store.listCloudflareAccounts().length, 1);
    assert.equal(store.getCloudflareAccount().email, "first@example.com");
  });
});

test("PanelAuthService rejects setup without mandatory 2FA confirmation", async () => {
  await withStore((store) => {
    const service = new PanelAuthService({ store });
    const result = service.createSetup({
      cfApiKey: "global-key-for-sqlite-storage",
      cfEmail: "first@example.com",
      password: "panel-password",
      totpCode: "123456",
      totpSecret: "JBSWY3DPEHPK3PXP",
      username: "operator",
    });

    assert.equal(result.statusCode, 400);
    assert.match(result.error, /2FA/);
    assert.equal(store.hasPanelUser(), false);
    assert.equal(store.hasCloudflareAccounts(), false);
  });
});
