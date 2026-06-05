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

function makeZone(overrides = {}) {
  return {
    id: "a".repeat(32),
    name: "alpha.example",
    status: "active",
    paused: false,
    type: "full",
    plan: { id: "free", name: "Free Website", legacy_id: "free" },
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
    comment: "",
    tags: [],
    created_on: "2026-01-01T00:00:00Z",
    modified_on: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeFirewallRule(overrides = {}) {
  return {
    id: "d".repeat(32),
    action: "block",
    description: "Block test traffic",
    filter: {
      id: "e".repeat(32),
      description: "Block test traffic",
      expression: "ip.src eq 192.0.2.10",
      paused: false,
    },
    paused: false,
    priority: 50,
    products: ["waf"],
    ref: "panel-test",
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
          value: "*.alpha.example/images/*",
        },
      },
    ],
    actions: [
      { id: "cache_level", value: "cache_everything" },
      { id: "browser_cache_ttl", value: 14400 },
    ],
    priority: 1,
    status: "active",
    created_on: "2026-01-01T00:00:00Z",
    modified_on: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeCustomCertificate(overrides = {}) {
  return {
    id: "c".repeat(32),
    hosts: ["alpha.example", "*.alpha.example"],
    issuer: "Let's Encrypt",
    signature: "SHA256WithRSA",
    status: "active",
    expires_on: "2026-12-31T00:00:00Z",
    uploaded_on: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("lists all Cloudflare zones through paginated API responses", async () => {
  const requests = [];
  const cloudflareMock = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    requests.push({
      path: url.pathname,
      page: url.searchParams.get("page"),
      perPage: url.searchParams.get("per_page"),
      email: request.headers["x-auth-email"],
      key: request.headers["x-auth-key"],
    });

    const page = Number(url.searchParams.get("page"));
    const result =
      page === 1
        ? [
            {
              ...makeZone({ id: "zone-one" }),
            },
          ]
        : [
            {
              ...makeZone({
                id: "zone-two",
                name: "beta.example",
                status: "pending",
                paused: true,
                type: "partial",
                plan: { id: "pro", name: "Pro Website", legacy_id: "pro" },
              }),
            },
          ];

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        success: true,
        errors: [],
        messages: [],
        result,
        result_info: {
          page,
          per_page: 50,
          total_pages: 2,
          total_count: 2,
        },
      })
    );
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3210;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);
    const response = await fetch(`http://127.0.0.1:${panelPort}/api/zones`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(
      payload.zones.map((zone) => [zone.id, zone.name, zone.status, zone.plan.name]),
      [
        ["zone-one", "alpha.example", "active", "Free Website"],
        ["zone-two", "beta.example", "pending", "Pro Website"],
      ]
    );
    assert.deepEqual(
      requests.map((request) => [request.path, request.page, request.perPage]),
      [
        ["/zones", "1", "50"],
        ["/zones", "2", "50"],
      ]
    );
    assert.equal(requests[0].email, "admin@example.com");
    assert.equal(requests[0].key, "global-key");
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("returns a clear setup error when credentials are missing", async () => {
  const panelPort = 3211;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "",
    CLOUDFLARE_GLOBAL_API_KEY: "",
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);
    const response = await fetch(`http://127.0.0.1:${panelPort}/api/zones`);
    const payload = await response.json();

    assert.equal(response.status, 412);
    assert.match(payload.error, /CLOUDFLARE_EMAIL/);
    assert.match(payload.error, /CLOUDFLARE_GLOBAL_API_KEY/);
  } finally {
    await panel.stop();
  }
});

test("reports credential status without exposing the Global API Key", async () => {
  const panelPort = 3215;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const statusResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/session/status`
    );
    const statusPayload = await statusResponse.json();

    assert.equal(statusResponse.status, 200);
    assert.equal(statusPayload.hasCredentials, true);
    assert.equal(statusPayload.email, "ad***@example.com");
    assert.equal(JSON.stringify(statusPayload).includes("global-key"), false);

    const connectResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/session/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "operator@example.com",
          globalApiKey: "runtime-key",
        }),
      }
    );
    const connectPayload = await connectResponse.json();

    assert.equal(connectResponse.status, 200);
    assert.equal(connectPayload.hasCredentials, true);
    assert.equal(connectPayload.email, "op******@example.com");
    assert.equal(JSON.stringify(connectPayload).includes("runtime-key"), false);

    const partialConnectResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/session/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "only-email@example.com",
        }),
      }
    );
    const partialConnectPayload = await partialConnectResponse.json();

    assert.equal(partialConnectResponse.status, 400);
    assert.match(partialConnectPayload.error, /同时填写/);
  } finally {
    await panel.stop();
  }
});

test("manages DNS records through Cloudflare DNS records API", async () => {
  const zoneId = "a".repeat(32);
  const recordId = "b".repeat(32);
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const bodyChunks = [];

    for await (const chunk of request) {
      bodyChunks.push(chunk);
    }

    const bodyText = Buffer.concat(bodyChunks).toString("utf8");
    requests.push({
      method: request.method,
      path: url.pathname,
      body: bodyText ? JSON.parse(bodyText) : null,
    });

    if (request.method === "GET" && url.pathname === "/zones") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makeZone({ id: zoneId })],
          result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
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
          result: [makeRecord({ id: recordId })],
          result_info: { page: 1, per_page: 100, total_pages: 1, total_count: 1 },
        })
      );
      return;
    }

    if (request.method === "POST" && url.pathname === `/zones/${zoneId}/dns_records`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makeRecord({ id: "c".repeat(32), ...requests.at(-1).body }),
        })
      );
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `/zones/${zoneId}/dns_records/${recordId}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makeRecord({ id: recordId, ...requests.at(-1).body }),
        })
      );
      return;
    }

    if (
      request.method === "DELETE" &&
      url.pathname === `/zones/${zoneId}/dns_records/${recordId}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: { id: recordId },
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, errors: [{ message: "not found" }] }));
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3212;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const listResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/dns-records`
    );
    const listPayload = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listPayload.records[0].name, "www.alpha.example");

    const createResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/dns-records`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "A",
          name: "api.alpha.example",
          content: "192.0.2.20",
          ttl: 1,
          proxied: true,
        }),
      }
    );
    const createPayload = await createResponse.json();
    assert.equal(createResponse.status, 201);
    assert.equal(createPayload.record.name, "api.alpha.example");

    const updateResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/dns-records/${recordId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "A",
          name: "www.alpha.example",
          content: "192.0.2.30",
          ttl: 120,
          proxied: false,
        }),
      }
    );
    const updatePayload = await updateResponse.json();
    assert.equal(updateResponse.status, 200);
    assert.equal(updatePayload.record.content, "192.0.2.30");
    assert.equal(updatePayload.record.proxied, false);

    const deleteResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/dns-records/${recordId}`,
      { method: "DELETE" }
    );
    const deletePayload = await deleteResponse.json();
    assert.equal(deleteResponse.status, 200);
    assert.equal(deletePayload.id, recordId);

    assert.deepEqual(
      requests
        .filter((request) => request.path.includes("/dns_records"))
        .map((request) => [request.method, request.path]),
      [
        ["GET", `/zones/${zoneId}/dns_records`],
        ["POST", `/zones/${zoneId}/dns_records`],
        ["PATCH", `/zones/${zoneId}/dns_records/${recordId}`],
        ["DELETE", `/zones/${zoneId}/dns_records/${recordId}`],
      ]
    );
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("manages cache settings and purge requests through Cloudflare cache APIs", async () => {
  const zoneId = "a".repeat(32);
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const bodyChunks = [];

    for await (const chunk of request) {
      bodyChunks.push(chunk);
    }

    const bodyText = Buffer.concat(bodyChunks).toString("utf8");
    requests.push({
      method: request.method,
      path: url.pathname,
      body: bodyText ? JSON.parse(bodyText) : null,
    });

    const settingMatch = url.pathname.match(
      new RegExp(`^/zones/${zoneId}/settings/(?<settingId>[a-z0-9_]+)$`)
    );

    if (settingMatch && request.method === "GET") {
      const values = {
        cache_level: "aggressive",
        browser_cache_ttl: 14400,
        development_mode: "off",
        always_online: "on",
      };

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: {
            id: settingMatch.groups.settingId,
            value: values[settingMatch.groups.settingId],
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
            value: requests.at(-1).body.value,
            editable: true,
          },
        })
      );
      return;
    }

    if (request.method === "POST" && url.pathname === `/zones/${zoneId}/purge_cache`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: { id: zoneId },
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, errors: [{ message: "not found" }] }));
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3213;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const listResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/cache-settings`
    );
    const listPayload = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listPayload.settings.cacheLevel.value, "aggressive");
    assert.equal(listPayload.settings.alwaysOnline.value, true);

    const updateResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/cache-settings`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cacheLevel: "basic",
          browserCacheTtl: 7200,
          developmentMode: true,
        }),
      }
    );
    assert.equal(updateResponse.status, 200);

    const purgeResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/purge-cache`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "url",
          url: "https://alpha.example/app.js",
        }),
      }
    );
    const purgePayload = await purgeResponse.json();
    assert.equal(purgeResponse.status, 200);
    assert.equal(purgePayload.mode, "url");

    assert.deepEqual(
      requests
        .filter((request) => request.method === "PATCH")
        .map((request) => [request.path, request.body.value]),
      [
        [`/zones/${zoneId}/settings/cache_level`, "basic"],
        [`/zones/${zoneId}/settings/browser_cache_ttl`, 7200],
        [`/zones/${zoneId}/settings/development_mode`, "on"],
      ]
    );
    assert.deepEqual(requests.at(-1).body, { files: ["https://alpha.example/app.js"] });
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("reads zone analytics through Cloudflare GraphQL API", async () => {
  const zoneId = "a".repeat(32);
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const bodyChunks = [];

    for await (const chunk of request) {
      bodyChunks.push(chunk);
    }

    const bodyText = Buffer.concat(bodyChunks).toString("utf8");
    const body = bodyText ? JSON.parse(bodyText) : null;
    requests.push({
      method: request.method,
      path: url.pathname,
      body,
    });

    if (
      request.method === "POST" &&
      url.pathname === "/graphql" &&
      body.query.includes("firewallEventsAdaptiveGroups")
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          data: {
            viewer: {
              zones: [
                {
                  firewallEventsAdaptiveGroups: [
                    {
                      count: 3,
                      dimensions: {
                        action: "block",
                        clientCountryName: "US",
                        clientIP: "192.0.2.1",
                        description: "Block scanner",
                        source: "waf",
                        userAgent: "bad-bot",
                      },
                    },
                  ],
                },
              ],
            },
          },
        })
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/graphql") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          data: {
            viewer: {
              zones: [
                {
                  httpRequests1dGroups: [
                    {
                      dimensions: { date: body.variables.dateStart },
                      sum: {
                        bytes: 2048,
                        cachedBytes: 1024,
                        cachedRequests: 60,
                        encryptedBytes: 1800,
                        encryptedRequests: 90,
                        pageViews: 40,
                        requests: 100,
                        threats: 2,
                        responseStatusMap: [
                          { edgeResponseStatus: 200, requests: 80 },
                          { edgeResponseStatus: 404, requests: 20 },
                        ],
                        countryMap: [
                          { bytes: 1500, clientCountryName: "US", requests: 70, threats: 1 },
                          { bytes: 548, clientCountryName: "CN", requests: 30, threats: 1 },
                        ],
                        contentTypeMap: [
                          { bytes: 1200, edgeResponseContentTypeName: "html", requests: 60 },
                          { bytes: 848, edgeResponseContentTypeName: "js", requests: 40 },
                        ],
                      },
                      uniq: { uniques: 25 },
                    },
                    {
                      dimensions: { date: body.variables.dateEnd },
                      sum: {
                        bytes: 1024,
                        cachedBytes: 256,
                        cachedRequests: 20,
                        encryptedBytes: 1024,
                        encryptedRequests: 50,
                        pageViews: 15,
                        requests: 50,
                        threats: 0,
                        responseStatusMap: [{ edgeResponseStatus: 200, requests: 50 }],
                        countryMap: [
                          { bytes: 1024, clientCountryName: "US", requests: 50, threats: 0 },
                        ],
                        contentTypeMap: [
                          { bytes: 1024, edgeResponseContentTypeName: "html", requests: 50 },
                        ],
                      },
                      uniq: { uniques: 10 },
                    },
                  ],
                },
              ],
            },
          },
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ errors: [{ message: "not found" }] }));
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3216;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const response = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/analytics?days=3`
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.analytics.range.days, 3);
    assert.equal(payload.analytics.totals.requests, 150);
    assert.equal(payload.analytics.totals.cachedRequests, 80);
    assert.equal(payload.analytics.totals.cacheHitRate, 53.33);
    assert.equal(payload.analytics.totals.encryptedRate, 93.33);
    assert.equal(payload.analytics.trend.length, 3);
    assert.deepEqual(
      payload.analytics.topCountries.map((item) => [item.id, item.requests, item.threats]),
      [
        ["US", 120, 1],
        ["CN", 30, 1],
      ]
    );
    assert.deepEqual(
      payload.analytics.topStatuses.map((item) => [item.id, item.requests]),
      [
        ["200", 130],
        ["404", 20],
      ]
    );
    assert.equal(requests.length, 2);
    assert.equal(requests[0].path, "/graphql");
    assert.equal(requests[0].body.variables.zoneTag, zoneId);
    assert.match(requests[0].body.query, /httpRequests1dGroups/);
    assert.match(requests[1].body.query, /firewallEventsAdaptiveGroups/);
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("manages firewall rules through Cloudflare firewall rules API", async () => {
  const zoneId = "a".repeat(32);
  const ruleId = "d".repeat(32);
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const bodyChunks = [];

    for await (const chunk of request) {
      bodyChunks.push(chunk);
    }

    const bodyText = Buffer.concat(bodyChunks).toString("utf8");
    requests.push({
      method: request.method,
      path: url.pathname,
      body: bodyText ? JSON.parse(bodyText) : null,
    });

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}/firewall/rules`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makeFirewallRule({ id: ruleId })],
          result_info: { page: 1, per_page: 50, total_count: 1 },
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
          result: [makeFirewallRule({ id: "f".repeat(32), ...requests.at(-1).body })],
          result_info: { page: 1, per_page: 50, total_count: 1 },
        })
      );
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `/zones/${zoneId}/firewall/rules/${ruleId}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makeFirewallRule({ id: ruleId, ...requests.at(-1).body }),
        })
      );
      return;
    }

    if (
      request.method === "DELETE" &&
      url.pathname === `/zones/${zoneId}/firewall/rules/${ruleId}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makeFirewallRule({ id: ruleId }),
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, errors: [{ message: "not found" }] }));
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3214;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const listResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/firewall-rules`
    );
    const listPayload = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listPayload.rules[0].expression, "ip.src eq 192.0.2.10");

    const createResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/firewall-rules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ip",
          target: "192.0.2.10",
          action: "block",
        }),
      }
    );
    const createPayload = await createResponse.json();
    assert.equal(createResponse.status, 201);
    assert.equal(createPayload.rule.expression, "ip.src eq 192.0.2.10");

    const updateResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/firewall-rules/${ruleId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          target: '(http.user_agent contains "sqlmap")',
          action: "js_challenge",
          description: "Block scanners",
          filterId: "e".repeat(32),
          paused: true,
        }),
      }
    );
    const updatePayload = await updateResponse.json();
    assert.equal(updateResponse.status, 200);
    assert.equal(updatePayload.rule.action, "js_challenge");
    assert.equal(updatePayload.rule.expression, '(http.user_agent contains "sqlmap")');
    assert.equal(updatePayload.rule.paused, true);

    const deleteResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/firewall-rules/${ruleId}`,
      { method: "DELETE" }
    );
    const deletePayload = await deleteResponse.json();
    assert.equal(deleteResponse.status, 200);
    assert.equal(deletePayload.id, ruleId);

    const postRequest = requests.find((request) => request.method === "POST");
    assert.deepEqual(postRequest.body, {
      action: "block",
      description: "面板规则: ip 192.0.2.10",
      filter: {
        description: "面板规则: ip 192.0.2.10",
        expression: "ip.src eq 192.0.2.10",
        paused: false,
      },
      paused: false,
    });

    const patchRequest = requests.find((request) => request.method === "PATCH");
    assert.deepEqual(patchRequest.body, {
      action: "js_challenge",
      description: "Block scanners",
      filter: {
        id: "e".repeat(32),
        description: "Block scanners",
        expression: '(http.user_agent contains "sqlmap")',
        paused: true,
      },
      paused: true,
    });
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("manages page rules through Cloudflare page rules API", async () => {
  const zoneId = "a".repeat(32);
  const ruleId = "f".repeat(32);
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const bodyChunks = [];

    for await (const chunk of request) {
      bodyChunks.push(chunk);
    }

    const bodyText = Buffer.concat(bodyChunks).toString("utf8");
    requests.push({
      method: request.method,
      path: url.pathname,
      body: bodyText ? JSON.parse(bodyText) : null,
    });

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}/pagerules`) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makePageRule({ id: ruleId })],
          result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
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
          result: makePageRule({ id: "g".repeat(32), ...requests.at(-1).body }),
        })
      );
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `/zones/${zoneId}/pagerules/${ruleId}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: makePageRule({ id: ruleId, ...requests.at(-1).body }),
        })
      );
      return;
    }

    if (
      request.method === "DELETE" &&
      url.pathname === `/zones/${zoneId}/pagerules/${ruleId}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: { id: ruleId },
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, errors: [{ message: "not found" }] }));
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3217;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const listResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/page-rules`
    );
    const listPayload = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listPayload.rules[0].urlPattern, "*.alpha.example/images/*");
    assert.equal(listPayload.rules[0].cacheLevel, "cache_everything");
    assert.equal(listPayload.rules[0].browserCacheTtl, "14400");

    const createResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/page-rules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlPattern: "*.alpha.example/private/*",
          cacheLevel: "bypass",
          securityLevel: "high",
          status: "active",
        }),
      }
    );
    const createPayload = await createResponse.json();
    assert.equal(createResponse.status, 201);
    assert.equal(createPayload.rule.urlPattern, "*.alpha.example/private/*");

    const updateResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/page-rules/${ruleId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlPattern: "*.alpha.example/old/*",
          forwardingType: "301",
          forwardingUrl: "https://alpha.example/new",
          status: "disabled",
        }),
      }
    );
    const updatePayload = await updateResponse.json();
    assert.equal(updateResponse.status, 200);
    assert.equal(updatePayload.rule.forwardingType, "301");
    assert.equal(updatePayload.rule.forwardingUrl, "https://alpha.example/new");

    const invalidResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/page-rules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlPattern: "*.alpha.example/mixed/*",
          cacheLevel: "basic",
          alwaysUseHttps: "on",
        }),
      }
    );
    const invalidPayload = await invalidResponse.json();
    assert.equal(invalidResponse.status, 400);
    assert.match(invalidPayload.error, /始终 HTTPS/);

    const deleteResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/page-rules/${ruleId}`,
      { method: "DELETE" }
    );
    const deletePayload = await deleteResponse.json();
    assert.equal(deleteResponse.status, 200);
    assert.equal(deletePayload.id, ruleId);

    const postRequest = requests.find((request) => request.method === "POST");
    assert.deepEqual(postRequest.body, {
      targets: [
        {
          target: "url",
          constraint: {
            operator: "matches",
            value: "*.alpha.example/private/*",
          },
        },
      ],
      actions: [
        { id: "cache_level", value: "bypass" },
        { id: "security_level", value: "high" },
      ],
      status: "active",
    });

    const patchRequest = requests.find((request) => request.method === "PATCH");
    assert.deepEqual(patchRequest.body.actions, [
      {
        id: "forwarding_url",
        value: {
          url: "https://alpha.example/new",
          status_code: 301,
        },
      },
    ]);
    assert.equal(patchRequest.body.status, "disabled");
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("reads and deletes custom certificates through Cloudflare certificate APIs", async () => {
  const zoneId = "a".repeat(32);
  const certificateId = "custom-cert_01";
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    requests.push({ method: request.method, path: url.pathname });

    if (
      request.method === "GET" &&
      url.pathname === `/zones/${zoneId}/ssl/universal/settings`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: {
            enabled: true,
            value: "auto",
            certificate_authority: "lets_encrypt",
            editable: true,
          },
        })
      );
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === `/zones/${zoneId}/custom_certificates`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [makeCustomCertificate({ id: certificateId })],
          result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/certificates") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [],
          result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 0 },
        })
      );
      return;
    }

    if (
      request.method === "DELETE" &&
      url.pathname === `/zones/${zoneId}/custom_certificates/${certificateId}`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: { id: certificateId },
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, errors: [{ message: "not found" }] }));
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3218;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const listResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/certificates`
    );
    const listPayload = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listPayload.universalSsl.enabled, true);
    assert.equal(listPayload.certificates[0].id, certificateId);
    assert.deepEqual(listPayload.certificates[0].hosts, [
      "alpha.example",
      "*.alpha.example",
    ]);

    const deleteResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/certificates/${certificateId}`,
      { method: "DELETE" }
    );
    const deletePayload = await deleteResponse.json();
    assert.equal(deleteResponse.status, 200);
    assert.equal(deletePayload.id, certificateId);

    assert.deepEqual(
      requests.map((request) => [request.method, request.path]),
      [
        ["GET", `/zones/${zoneId}/ssl/universal/settings`],
        ["GET", `/zones/${zoneId}/custom_certificates`],
        ["GET", "/certificates"],
        ["DELETE", `/zones/${zoneId}/custom_certificates/${certificateId}`],
      ]
    );
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("keeps certificate page usable when custom certificate listing is unavailable", async () => {
  const zoneId = "a".repeat(32);
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    requests.push({ method: request.method, path: url.pathname });

    if (
      request.method === "GET" &&
      url.pathname === `/zones/${zoneId}/ssl/universal/settings`
    ) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: {
            enabled: true,
            value: "auto",
            certificate_authority: "lets_encrypt",
            editable: true,
          },
        })
      );
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === `/zones/${zoneId}/custom_certificates`
    ) {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: false,
          errors: [{ message: "custom certificates require Enterprise" }],
          messages: [],
          result: null,
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/certificates") {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          success: false,
          errors: [{ message: "Origin CA requires permission" }],
          messages: [],
          result: null,
        })
      );
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, errors: [{ message: "not found" }] }));
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3219;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const response = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/certificates`
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.universalSsl.enabled, true);
    assert.deepEqual(payload.certificates, []);
    assert.equal(payload.warnings.length, 2);
    assert.match(payload.warnings[0], /Enterprise/);
    assert.deepEqual(
      requests.map((request) => [request.method, request.path]),
      [
        ["GET", `/zones/${zoneId}/ssl/universal/settings`],
        ["GET", `/zones/${zoneId}/custom_certificates`],
        ["GET", "/certificates"],
      ]
    );
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("renders firewall settings view without frontend reference errors", async () => {
  const [{ resetFirewallForm, state }, { renderFirewallSettingsView }] = await Promise.all([
    import("../public/js/state.js"),
    import("../public/js/views/zone/firewall-view.js"),
  ]);

  resetFirewallForm();
  state.selectedZone = {
    id: "a".repeat(32),
    name: "alpha.example",
    status: "active",
    plan: { id: "free", name: "Free Website" },
  };
  state.firewallRules = [];
  state.loadingFirewallRules = false;
  state.firewallError = "";
  state.notice = "";

  const html = renderFirewallSettingsView();

  assert.match(html, /防火墙规则管理/);
  assert.match(html, /规则类型/);
  assert.match(html, /动作/);
  assert.match(html, /暂无防火墙规则/);
});
