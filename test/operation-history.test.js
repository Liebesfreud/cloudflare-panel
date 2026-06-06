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

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : null;
}

function json(response, statusCode, payload) {
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

test("records mutating API operation history without exposing request bodies", async () => {
  const zoneId = "a".repeat(32);
  const requests = [];
  const cloudflareMock = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const body = await readJsonBody(request);
    requests.push({ method: request.method, path: url.pathname, body });

    if (request.method === "POST" && url.pathname === `/zones/${zoneId}/dns_records`) {
      json(
        response,
        200,
        cloudflareSuccess({
          id: "b".repeat(32),
          type: body.type,
          name: body.name,
          content: body.content,
          ttl: body.ttl,
          proxied: false,
          proxiable: false,
          comment: body.comment || "",
          tags: [],
          created_on: "2026-01-01T00:00:00Z",
          modified_on: "2026-01-01T00:00:00Z",
        })
      );
      return;
    }

    json(response, 404, {
      success: false,
      errors: [{ message: "not found" }],
      messages: [],
    });
  });

  const mockUrl = await listen(cloudflareMock);
  const panelPort = 3228;
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "global-key",
    CLOUDFLARE_API_BASE_URL: mockUrl,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const createResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/dns-records`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TXT",
          name: "_audit.alpha.example",
          content: "super-secret-history-body",
          ttl: 1,
        }),
      }
    );
    assert.equal(createResponse.status, 201);

    const invalidResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/zones/${zoneId}/dns-records`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "UNSUPPORTED",
          name: "broken.alpha.example",
          content: "should-not-reach-cloudflare",
          ttl: 1,
        }),
      }
    );
    const invalidPayload = await invalidResponse.json();
    assert.equal(invalidResponse.status, 400);
    assert.match(invalidPayload.error, /DNS 记录类型/);

    const historyResponse = await fetch(`http://127.0.0.1:${panelPort}/api/operation-history`);
    const historyPayload = await historyResponse.json();
    const serializedHistory = JSON.stringify(historyPayload);

    assert.equal(historyResponse.status, 200);
    assert.equal(historyPayload.history.entries.length, 2);
    assert.deepEqual(
      historyPayload.history.entries.map((entry) => [entry.module, entry.method, entry.status]),
      [
        ["DNS 记录", "POST", "failed"],
        ["DNS 记录", "POST", "success"],
      ]
    );
    assert.match(historyPayload.history.entries[0].error, /DNS 记录类型/);
    assert.equal(serializedHistory.includes("super-secret-history-body"), false);
    assert.equal(serializedHistory.includes("should-not-reach-cloudflare"), false);

    const failedHistoryResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/operation-history?status=failed`
    );
    const failedHistoryPayload = await failedHistoryResponse.json();
    assert.equal(failedHistoryPayload.history.entries.length, 1);
    assert.equal(failedHistoryPayload.history.entries[0].status, "failed");

    const moduleHistoryResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/operation-history?module=${encodeURIComponent("DNS 记录")}`
    );
    const moduleHistoryPayload = await moduleHistoryResponse.json();
    assert.equal(moduleHistoryPayload.history.entries.length, 2);

    const clearResponse = await fetch(`http://127.0.0.1:${panelPort}/api/operation-history`, {
      method: "DELETE",
    });
    const clearPayload = await clearResponse.json();
    assert.equal(clearResponse.status, 200);
    assert.equal(clearPayload.history.deleted, 2);

    const emptyHistoryResponse = await fetch(
      `http://127.0.0.1:${panelPort}/api/operation-history`
    );
    const emptyHistoryPayload = await emptyHistoryResponse.json();
    assert.equal(emptyHistoryPayload.history.entries.length, 0);

    assert.deepEqual(
      requests.map((request) => [request.method, request.path]),
      [["POST", `/zones/${zoneId}/dns_records`]]
    );
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("renders operation history view with filters and compact rows", async () => {
  const [{ resetOperationHistoryState, state }, { renderHistoryView }] = await Promise.all([
    import("../public/js/state.js"),
    import("../public/js/views/history-view.js"),
  ]);

  const app = { className: "", innerHTML: "" };
  global.document = {
    querySelector(selector) {
      assert.equal(selector, "#app");
      return app;
    },
  };

  resetOperationHistoryState();
  state.connected = true;
  state.mainSection = "history";
  state.view = "domains";
  state.sessionEmail = "admin@example.com";
  state.operationHistoryFilters = {
    modules: ["DNS 记录", "Workers"],
    statuses: ["success", "failed"],
  };
  state.operationHistory = [
    {
      id: "history-1",
      action: "创建",
      createdAt: "2026-06-05T10:00:00Z",
      durationMs: 18,
      error: "",
      method: "POST",
      module: "DNS 记录",
      path: "zones/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/dns-records",
      resource: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "success",
      statusCode: 201,
    },
  ];

  renderHistoryView();

  assert.match(app.innerHTML, /操作历史/);
  assert.match(app.innerHTML, /最近操作/);
  assert.match(app.innerHTML, /DNS 记录/);
  assert.match(app.innerHTML, /POST/);
  assert.match(app.innerHTML, /成功/);
  assert.match(app.innerHTML, /data-history-filter="module"/);
  assert.match(app.innerHTML, /history-clear/);

  delete global.document;
});
