import { once } from "node:events";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import assert from "node:assert/strict";

function listen(server, port = 0) {
  server.listen(port, "127.0.0.1");
  return once(server, "listening").then(() => {
    const address = server.address();
    return `http://127.0.0.1:${address.port}`;
  });
}

async function waitForHttp(url) {
  const deadline = Date.now() + 3_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function startPanel(env) {
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      AUTH: "",
      CF_API1: "",
      CF_API2: "",
      CF_API_KEY: "",
      CF_EMAIL: "",
      CF_GLOBAL_API_KEY: "",
      CF_PANEL_SKIP_DOTENV: "true",
      CLOUDFLARE_API_KEY: "",
      CLOUDFLARE_EMAIL: "",
      CLOUDFLARE_GLOBAL_API_KEY: "",
      EMAIL1: "",
      EMAIL2: "",
      PASSWORD: "",
      USER: "",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));

  return {
    child,
    output,
    async stop() {
      child.kill();
      await once(child, "exit").catch(() => {});
    },
  };
}

function makeZone(zoneId, overrides = {}) {
  return {
    id: zoneId,
    name: "alpha.example",
    status: "active",
    ...overrides,
  };
}

function makeRecord(overrides = {}) {
  return {
    id: "b".repeat(32),
    type: "A",
    name: "www.alpha.example",
    content: "192.0.2.10",
    ttl: 1,
    proxied: true,
    proxiable: true,
    created_on: "2026-01-01T00:00:00Z",
    modified_on: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeFirewallRule(overrides = {}) {
  return {
    id: "d".repeat(32),
    action: "block",
    description: "[auto-optimization] block-query-params",
    filter: {
      id: "e".repeat(32),
      description: "[auto-optimization] block-query-params",
      expression: "len(http.request.uri.query) gt 0",
      paused: false,
    },
    paused: false,
    ...overrides,
  };
}

function makePageRule(overrides = {}) {
  return {
    id: "f".repeat(32),
    targets: [
      {
        target: "url",
        constraint: {
          operator: "matches",
          value: "alpha.example/*",
        },
      },
    ],
    actions: [{ id: "cache_level", value: "cache_everything" }],
    status: "active",
    priority: 1,
    ...overrides,
  };
}

function settingValue(settingId) {
  const values = {
    security_level: "medium",
    ssl: "strict",
    always_use_https: "off",
    automatic_https_rewrites: "on",
    tls_1_3: "on",
    min_tls_version: "1.2",
    opportunistic_encryption: "off",
    challenge_ttl: 1800,
    browser_check: "on",
    hotlink_protection: "off",
    email_obfuscation: "on",
    ipv6: "on",
    cache_level: "aggressive",
    browser_cache_ttl: 7200,
    minify: { html: "on", css: "on", js: "off" },
    polish: "off",
    brotli: "on",
    early_hints: "off",
    http3: "on",
    "0rtt": "off",
    rocket_loader: "off",
  };

  return values[settingId] ?? "off";
}

function createCloudflareAutomationMock(zoneId, requests) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const bodyChunks = [];

    for await (const chunk of request) {
      bodyChunks.push(chunk);
    }

    const bodyText = Buffer.concat(bodyChunks).toString("utf8");
    const body = bodyText ? JSON.parse(bodyText) : null;
    requests.push({ method: request.method, path: url.pathname, body });

    const settingMatch = url.pathname.match(
      new RegExp(`^/zones/${zoneId}/settings/(?<settingId>[a-z0-9_]+)$`)
    );

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makeZone(zoneId),
        })
      );
      return;
    }

    if (settingMatch && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: settingMatch.groups.settingId,
            value: settingValue(settingMatch.groups.settingId),
            editable: true,
            modified_on: "2026-01-01T00:00:00Z",
          },
        })
      );
      return;
    }

    if (settingMatch && request.method === "PATCH") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: settingMatch.groups.settingId,
            value: body.value,
            editable: true,
            modified_on: "2026-01-01T00:00:00Z",
          },
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}/dns_records`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makeRecord()],
          result_info: { page: 1, per_page: 100, total_pages: 1, total_count: 1 },
        })
      );
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `/zones/${zoneId}/dns_records/${"b".repeat(32)}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makeRecord(body),
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}/firewall/rules`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makeFirewallRule()],
          result_info: { page: 1, per_page: 50, total_count: 1 },
        })
      );
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `/zones/${zoneId}/firewall/rules/${"d".repeat(32)}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makeFirewallRule(body),
        })
      );
      return;
    }

    if (request.method === "POST" && url.pathname === `/zones/${zoneId}/firewall/rules`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makeFirewallRule({ id: "g".repeat(32), ...body })],
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}/pagerules`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makePageRule()],
          result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
        })
      );
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `/zones/${zoneId}/pagerules/${"f".repeat(32)}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makePageRule({ id: "f".repeat(32), ...body }),
        })
      );
      return;
    }

    if (request.method === "POST" && url.pathname === `/zones/${zoneId}/pagerules`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makePageRule({ id: "h".repeat(32), ...body }),
        })
      );
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === `/zones/${zoneId}/cache/tiered_cache_smart_topology_enable`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: { value: "off" },
        })
      );
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `/zones/${zoneId}/cache/tiered_cache_smart_topology_enable`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: { value: body.value },
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, errors: [{ message: "not found" }] }));
  });
}

test("reads automation settings and original-style toggles from Cloudflare APIs", async () => {
  const zoneId = "a".repeat(32);
  const requests = [];
  const cloudflareMock = createCloudflareAutomationMock(zoneId, requests);
  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3224;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const response = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/automation`
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.automation.zone.name, "alpha.example");
    assert.equal(payload.automation.settings.securityLevel.value, "medium");
    assert.equal(payload.automation.settings.minify.value.js, false);
    assert.equal(payload.automation.dnsProxy.proxiableCount, 1);
    assert.equal(payload.automation.dnsProxy.proxiedCount, 1);
    assert.equal(payload.automation.firewall.blockQueryParams.enabled, true);
    assert.equal(payload.automation.pageRules.cacheAllPages.enabled, true);
    assert.equal(payload.automation.pageRules.cacheHtml.pattern, "alpha.example/*.html*");
    assert.equal(payload.automation.tieredCaching.supported, true);
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("applies automation speed preset and continues through readable setting map", async () => {
  const zoneId = "a".repeat(32);
  const requests = [];
  const cloudflareMock = createCloudflareAutomationMock(zoneId, requests);
  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3225;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const response = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/automation/apply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: "speed" }),
      }
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.automation.preset, "speed");
    assert.deepEqual(
      requests
        .filter((request) => request.method === "PATCH" && request.path.includes("/settings/"))
        .map((request) => [request.path, request.body.value]),
      [
        [`/zones/${zoneId}/settings/security_level`, "low"],
        [`/zones/${zoneId}/settings/ssl`, "strict"],
        [`/zones/${zoneId}/settings/cache_level`, "aggressive"],
        [`/zones/${zoneId}/settings/browser_cache_ttl`, 31_536_000],
        [`/zones/${zoneId}/settings/polish`, "lossless"],
        [
          `/zones/${zoneId}/settings/minify`,
          { css: "on", html: "on", js: "on" },
        ],
        [`/zones/${zoneId}/settings/brotli`, "on"],
        [`/zones/${zoneId}/settings/early_hints`, "on"],
        [`/zones/${zoneId}/settings/http3`, "on"],
      ]
    );
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("toggles automation firewall, page rule, DNS proxy, and tiered caching endpoints", async () => {
  const zoneId = "a".repeat(32);
  const requests = [];
  const cloudflareMock = createCloudflareAutomationMock(zoneId, requests);
  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3226;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const firewallResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/automation/firewall/blockQueryParams`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      }
    );
    assert.equal(firewallResponse.status, 200);

    const pageRuleResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/automation/page-rules/cacheAllPages`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      }
    );
    assert.equal(pageRuleResponse.status, 200);

    const dnsResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/automation/dns-proxy`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      }
    );
    assert.equal(dnsResponse.status, 200);

    const tieredResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/automation/tiered-caching`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      }
    );
    assert.equal(tieredResponse.status, 200);

    assert.deepEqual(
      requests
        .filter((request) => request.method === "PATCH")
        .map((request) => [request.path, request.body]),
      [
        [
          `/zones/${zoneId}/firewall/rules/${"d".repeat(32)}`,
          {
            action: "block",
            description: "[auto-optimization] block-query-params",
            filter: {
              description: "[auto-optimization] block-query-params",
              expression: "len(http.request.uri.query) gt 0",
              paused: true,
            },
            paused: true,
          },
        ],
        [
          `/zones/${zoneId}/pagerules/${"f".repeat(32)}`,
          {
            targets: [
              {
                target: "url",
                constraint: {
                  operator: "matches",
                  value: "alpha.example/*",
                },
              },
            ],
            actions: [{ id: "cache_level", value: "cache_everything" }],
            status: "disabled",
          },
        ],
        [
          `/zones/${zoneId}/dns_records/${"b".repeat(32)}`,
          {
            type: "A",
            name: "www.alpha.example",
            content: "192.0.2.10",
            ttl: 1,
            proxied: false,
          },
        ],
        [
          `/zones/${zoneId}/cache/tiered_cache_smart_topology_enable`,
          { value: "on" },
        ],
      ]
    );
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("renders automation view with original compact controls", async () => {
  const [{ state }, { renderAutomationView }] = await Promise.all([
    import("../public/js/state.js"),
    import("../public/js/views/automation-view.js"),
  ]);

  global.document = {
    querySelector(selector) {
      assert.equal(selector, "#app");
      return {
        className: "",
        innerHTML: "",
      };
    },
  };

  const app = {
    className: "",
    innerHTML: "",
  };

  global.document.querySelector = () => app;
  state.connected = true;
  state.mainSection = "automation";
  state.view = "domains";
  state.zones = [{ id: "a".repeat(32), name: "alpha.example" }];
  state.automationZoneId = "a".repeat(32);
  state.automationPreset = "security";
  state.automationLoading = false;
  state.automationApplying = false;
  state.automationPendingKey = "";
  state.automationState = {
    zone: { id: "a".repeat(32), name: "alpha.example" },
    settings: {
      securityLevel: { value: "medium" },
      challengeTtl: { value: 1800 },
      browserCheck: { value: true },
      hotlinkProtection: { value: false },
      emailObfuscation: { value: true },
      ipv6: { value: true },
      cacheLevel: { value: "aggressive" },
      browserCacheTtl: { value: 7200 },
      minify: { value: { html: true, css: true, js: false } },
      brotli: { value: true },
      http3: { value: true },
      zeroRtt: { value: false },
      rocketLoader: { value: "off" },
    },
    dnsProxy: { enabled: true, proxiableCount: 2, proxiedCount: 2 },
    firewall: {
      blockQueryParams: { enabled: true },
      blockNonChinaTraffic: { enabled: false },
      blockNonGetTraffic: { enabled: false },
    },
    pageRules: {
      cacheAllPages: { enabled: true, pattern: "alpha.example/*" },
      cacheHtml: { enabled: false, pattern: "alpha.example/*.html*" },
    },
    tieredCaching: { supported: true, enabled: false },
    warnings: [],
  };

  renderAutomationView();

  assert.match(app.innerHTML, /即时生效模式已开启/);
  assert.match(app.innerHTML, /自动优化设置/);
  assert.match(app.innerHTML, /安全优化将配置/);
  assert.match(app.innerHTML, /操作代理IP/);
  assert.match(app.innerHTML, /缓存设置/);
  assert.match(app.innerHTML, /性能加速/);

  delete global.document;
});
