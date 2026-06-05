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

  return {
    child,
    async stop() {
      child.kill();
      await once(child, "exit").catch(() => {});
    },
  };
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const bodyText = Buffer.concat(chunks).toString("utf8");
  return bodyText ? JSON.parse(bodyText) : null;
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function cloudflareSuccess(result, resultInfo) {
  return {
    success: true,
    errors: [],
    messages: [],
    result,
    ...(resultInfo ? { result_info: resultInfo } : {}),
  };
}

function makeDnsRecord(overrides = {}) {
  return {
    id: "b".repeat(32),
    type: "A",
    name: "saas.alpha.example",
    content: "6.6.6.6",
    ttl: 1,
    proxied: true,
    proxiable: true,
    comment: "一键加速回退源",
    tags: [],
    created_on: "2026-01-01T00:00:00Z",
    modified_on: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeCustomHostname(overrides = {}) {
  return {
    id: "custom-hostname-01",
    hostname: "cdn.alpha.example",
    custom_origin_server: "origin.alpha.example",
    status: "pending",
    ssl: {
      method: "http",
      status: "pending_validation",
      type: "dv",
    },
    ...overrides,
  };
}

function createCloudflareMock({ dnsRecords = [], customHostnames = [] } = {}) {
  const zoneId = "a".repeat(32);
  const requests = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const body = await readRequestBody(request);

    requests.push({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body,
    });

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}/dns_records`) {
      jsonResponse(
        response,
        200,
        cloudflareSuccess(dnsRecords, {
          page: 1,
          per_page: 100,
          total_pages: 1,
          total_count: dnsRecords.length,
        })
      );
      return;
    }

    if (request.method === "POST" && url.pathname === `/zones/${zoneId}/dns_records`) {
      const record = makeDnsRecord({
        id: "c".repeat(32),
        ...body,
        name: body.name.includes(".") ? body.name : `${body.name}.alpha.example`,
      });
      dnsRecords.push(record);
      jsonResponse(response, 200, cloudflareSuccess(record));
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname.startsWith(`/zones/${zoneId}/dns_records/`)
    ) {
      const recordId = url.pathname.split("/").at(-1);
      const nextRecord = makeDnsRecord({
        id: recordId,
        ...body,
        name: body.name.includes(".") ? body.name : `${body.name}.alpha.example`,
      });
      dnsRecords = dnsRecords.map((record) =>
        record.id === recordId ? nextRecord : record
      );
      jsonResponse(response, 200, cloudflareSuccess(nextRecord));
      return;
    }

    if (request.method === "PATCH" && url.pathname === `/zones/${zoneId}/settings/ssl`) {
      jsonResponse(
        response,
        200,
        cloudflareSuccess({
          id: "ssl",
          value: body.value,
          editable: true,
        })
      );
      return;
    }

    if (
      request.method === "PUT" &&
      url.pathname === `/zones/${zoneId}/custom_hostnames/fallback_origin`
    ) {
      jsonResponse(
        response,
        200,
        cloudflareSuccess({
          origin: body.origin,
          status: "active",
        })
      );
      return;
    }

    if (request.method === "GET" && url.pathname === `/zones/${zoneId}/custom_hostnames`) {
      const hostname = url.searchParams.get("hostname");
      const result = customHostnames.filter((item) => item.hostname === hostname);
      jsonResponse(
        response,
        200,
        cloudflareSuccess(result, {
          page: 1,
          per_page: 50,
          total_pages: 1,
          total_count: result.length,
        })
      );
      return;
    }

    if (request.method === "POST" && url.pathname === `/zones/${zoneId}/custom_hostnames`) {
      const hostname = makeCustomHostname(body);
      customHostnames.push(hostname);
      jsonResponse(response, 200, cloudflareSuccess(hostname));
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname.startsWith(`/zones/${zoneId}/custom_hostnames/`)
    ) {
      const hostnameId = url.pathname.split("/").at(-1);
      const existingHostname = customHostnames.find((item) => item.id === hostnameId);
      const hostname = makeCustomHostname({
        ...existingHostname,
        ...body,
        id: hostnameId,
      });
      customHostnames = customHostnames.map((item) =>
        item.id === hostnameId ? hostname : item
      );
      jsonResponse(response, 200, cloudflareSuccess(hostname));
      return;
    }

    jsonResponse(response, 404, {
      success: false,
      errors: [{ message: "not found" }],
      messages: [],
    });
  });

  return { requests, server };
}

async function postSpeedDeploy(panelPort, zoneId, body) {
  const response = await fetch(
    `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/speed-deploy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const payload = await response.json();

  return { payload, response };
}

test("deploys one-click acceleration through Cloudflare SaaS APIs", async () => {
  const zoneId = "a".repeat(32);
  const cloudflareMock = createCloudflareMock({
    dnsRecords: [
      makeDnsRecord({
        id: "d".repeat(32),
        type: "A",
        name: "origin.alpha.example",
        content: "192.0.2.10",
        proxied: false,
        comment: "",
      }),
    ],
  });
  const mockUrl = await listen(cloudflareMock.server);
  const panelPort = 3220;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const { payload, response } = await postSpeedDeploy(panelPort, zoneId, {
      accessDomain: "cdn.alpha.example",
      targetDomain: "origin.alpha.example",
      cacheTtl: "0",
      optimizedDomain: "saas.sin.fan",
      zoneName: "alpha.example",
    });

    assert.equal(response.status, 200);
    assert.equal(payload.deployment.accessDomain, "cdn.alpha.example");
    assert.equal(payload.deployment.accessRecord.name, "cdn.alpha.example");
    assert.equal(payload.deployment.accessRecord.content, "saas.sin.fan");
    assert.equal(payload.deployment.fallbackRecord.name, "saas.alpha.example");
    assert.equal(payload.deployment.fallbackOrigin.origin, "saas.alpha.example");
    assert.equal(payload.deployment.sslSetting.value, "flexible");

    assert.deepEqual(
      cloudflareMock.requests.map((request) => [request.method, request.path]),
      [
        ["GET", `/zones/${zoneId}/dns_records`],
        ["POST", `/zones/${zoneId}/dns_records`],
        ["POST", `/zones/${zoneId}/dns_records`],
        ["PATCH", `/zones/${zoneId}/settings/ssl`],
        ["PUT", `/zones/${zoneId}/custom_hostnames/fallback_origin`],
        ["GET", `/zones/${zoneId}/custom_hostnames`],
        ["POST", `/zones/${zoneId}/custom_hostnames`],
      ]
    );

    assert.deepEqual(cloudflareMock.requests[1].body, {
      type: "CNAME",
      name: "cdn.alpha.example",
      content: "saas.sin.fan",
      ttl: 1,
      proxied: false,
      comment: "一键加速优选域名",
    });
    assert.deepEqual(cloudflareMock.requests[2].body, {
      type: "A",
      name: "saas.alpha.example",
      content: "6.6.6.6",
      ttl: 1,
      proxied: true,
      comment: "一键加速回退源",
    });
    assert.deepEqual(cloudflareMock.requests[3].body, { value: "flexible" });
    assert.deepEqual(cloudflareMock.requests[4].body, {
      origin: "saas.alpha.example",
    });
    assert.equal(cloudflareMock.requests[5].query.hostname, "cdn.alpha.example");
    assert.deepEqual(cloudflareMock.requests[6].body, {
      hostname: "cdn.alpha.example",
      custom_origin_server: "origin.alpha.example",
      ssl: {
        method: "http",
        type: "dv",
        settings: {
          min_tls_version: "1.2",
        },
      },
    });
  } finally {
    await panel.stop();
    cloudflareMock.server.close();
  }
});

test("updates managed fallback DNS and existing custom hostname idempotently", async () => {
  const zoneId = "a".repeat(32);
  const fallbackRecordId = "b".repeat(32);
  const customHostnameId = "existing-hostname-01";
  const cloudflareMock = createCloudflareMock({
    customHostnames: [
      makeCustomHostname({
        id: customHostnameId,
        hostname: "cdn.alpha.example",
        custom_origin_server: "old-origin.alpha.example",
      }),
    ],
    dnsRecords: [
      makeDnsRecord({
        id: "1".repeat(32),
        type: "A",
        name: "origin.alpha.example",
        content: "192.0.2.10",
        proxied: false,
        comment: "",
      }),
      makeDnsRecord({
        id: "2".repeat(32),
        type: "CNAME",
        name: "cdn.alpha.example",
        content: "old-target.example",
        proxied: true,
        comment: "",
      }),
      makeDnsRecord({
        id: fallbackRecordId,
        proxied: false,
        comment: "",
      }),
    ],
  });
  const mockUrl = await listen(cloudflareMock.server);
  const panelPort = 3221;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const { payload, response } = await postSpeedDeploy(panelPort, zoneId, {
      accessDomain: "cdn.alpha.example",
      targetDomain: "origin.alpha.example",
      cacheTtl: "120",
      optimizedDomain: "saas.sin.fan",
      zoneName: "alpha.example",
    });

    assert.equal(response.status, 200);
    assert.equal(payload.deployment.accessRecord.content, "saas.sin.fan");
    assert.equal(payload.deployment.accessRecord.proxied, false);
    assert.equal(payload.deployment.fallbackRecord.proxied, true);
    assert.equal(payload.deployment.customHostname.customOriginServer, "origin.alpha.example");

    assert.deepEqual(
      cloudflareMock.requests.map((request) => [request.method, request.path]),
      [
        ["GET", `/zones/${zoneId}/dns_records`],
        ["PATCH", `/zones/${zoneId}/dns_records/${"2".repeat(32)}`],
        ["PATCH", `/zones/${zoneId}/dns_records/${fallbackRecordId}`],
        ["PATCH", `/zones/${zoneId}/settings/ssl`],
        ["PUT", `/zones/${zoneId}/custom_hostnames/fallback_origin`],
        ["GET", `/zones/${zoneId}/custom_hostnames`],
        ["PATCH", `/zones/${zoneId}/custom_hostnames/${customHostnameId}`],
      ]
    );
    assert.deepEqual(cloudflareMock.requests[1].body, {
      type: "CNAME",
      name: "cdn.alpha.example",
      content: "saas.sin.fan",
      ttl: 1,
      proxied: false,
      comment: "一键加速优选域名",
    });
    assert.deepEqual(cloudflareMock.requests[2].body, {
      type: "A",
      name: "saas.alpha.example",
      content: "6.6.6.6",
      ttl: 1,
      proxied: true,
      comment: "一键加速回退源",
    });
    assert.deepEqual(cloudflareMock.requests[6].body, {
      custom_origin_server: "origin.alpha.example",
      ssl: {
        method: "http",
        type: "dv",
        settings: {
          min_tls_version: "1.2",
        },
      },
    });
  } finally {
    await panel.stop();
    cloudflareMock.server.close();
  }
});

test("allows a custom optimized domain outside the recommended list", async () => {
  const zoneId = "a".repeat(32);
  const cloudflareMock = createCloudflareMock({
    dnsRecords: [
      makeDnsRecord({
        id: "d".repeat(32),
        type: "A",
        name: "origin.alpha.example",
        content: "192.0.2.10",
        proxied: false,
        comment: "",
      }),
    ],
  });
  const mockUrl = await listen(cloudflareMock.server);
  const panelPort = 3227;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const { payload, response } = await postSpeedDeploy(panelPort, zoneId, {
      accessDomain: "cdn.alpha.example",
      targetDomain: "origin.alpha.example",
      cacheTtl: "0",
      optimizedDomain: "custom.optimized.example",
      zoneName: "alpha.example",
    });

    assert.equal(response.status, 200);
    assert.equal(payload.deployment.optimizedDomain, "custom.optimized.example");
    assert.deepEqual(cloudflareMock.requests[1].body, {
      type: "CNAME",
      name: "cdn.alpha.example",
      content: "custom.optimized.example",
      ttl: 1,
      proxied: false,
      comment: "一键加速优选域名",
    });
  } finally {
    await panel.stop();
    cloudflareMock.server.close();
  }
});

test("renders saas.sin.fan as default and exposes custom optimized domain input", async () => {
  const [{ state }, { renderSpeedView }] = await Promise.all([
    import("../public/js/state.js"),
    import("../public/js/views/speed-view.js"),
  ]);
  const app = {
    className: "",
    innerHTML: "",
  };

  global.document = {
    querySelector(selector) {
      assert.equal(selector, "#app");
      return app;
    },
  };

  state.connected = true;
  state.mainSection = "speed";
  state.view = "domains";
  state.speedStep = "domains";
  state.speedForm = {
    accessDomain: "",
    targetDomain: "",
    cacheTtl: "0",
    optimizedDomain: "saas.sin.fan",
    optimizedDomainCustom: "",
  };

  renderSpeedView();

  assert.match(app.innerHTML, /saas\.sin\.fan 推荐/);
  assert.match(app.innerHTML, /自定义优选域名/);
  assert.match(app.innerHTML, /填写后会覆盖上方推荐选项/);

  delete global.document;
});

test("warns when an in-zone source domain has no DNS record", async () => {
  const zoneId = "a".repeat(32);
  const cloudflareMock = createCloudflareMock();
  const mockUrl = await listen(cloudflareMock.server);
  const panelPort = 3223;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const { payload, response } = await postSpeedDeploy(panelPort, zoneId, {
      accessDomain: "cdn.alpha.example",
      targetDomain: "origin.alpha.example",
      cacheTtl: "0",
      optimizedDomain: "cdn.cnno.de",
      zoneName: "alpha.example",
    });

    assert.equal(response.status, 409);
    assert.match(payload.error, /源站域名 origin\.alpha\.example 未添加 DNS 解析/);
    assert.deepEqual(
      cloudflareMock.requests.map((request) => [request.method, request.path]),
      [["GET", `/zones/${zoneId}/dns_records`]]
    );
  } finally {
    await panel.stop();
    cloudflareMock.server.close();
  }
});

test("rejects one-click acceleration when the access domain is outside the zone", async () => {
  const zoneId = "a".repeat(32);
  const cloudflareMock = createCloudflareMock();
  const mockUrl = await listen(cloudflareMock.server);
  const panelPort = 3222;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const { payload, response } = await postSpeedDeploy(panelPort, zoneId, {
      accessDomain: "cdn.other.example",
      targetDomain: "origin.alpha.example",
      cacheTtl: "0",
      optimizedDomain: "saas.sin.fan",
      zoneName: "alpha.example",
    });

    assert.equal(response.status, 400);
    assert.match(payload.error, /访问域名必须属于 alpha\.example/);
    assert.equal(cloudflareMock.requests.length, 0);
  } finally {
    await panel.stop();
    cloudflareMock.server.close();
  }
});
