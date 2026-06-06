import { once } from "node:events";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  allocatePanelPort,
  preparePanelTestEnvironment,
} from "./helpers/panel-test-environment.js";

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
  const prepared = preparePanelTestEnvironment(env);
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, ...prepared.env },
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
      prepared.cleanup();
    },
  };
}

function makeJsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

function createDeveloperResourcesMock({ accountId, requests }) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const body = await readJsonBody(request);
    requests.push({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body,
    });

    if (request.method === "GET" && url.pathname === "/accounts") {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: [{ id: accountId, name: "Test Account", type: "standard" }],
        result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
      });
      return;
    }

    if (request.method === "GET" && url.pathname === `/accounts/${accountId}/pages/projects`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: [
          {
            id: "pages-id",
            name: "docs-site",
            production_branch: "main",
            subdomain: "docs-site.pages.dev",
            created_on: "2026-01-01T00:00:00Z",
            latest_deployment: { id: "deploy-1", latest_stage: { status: "success" } },
          },
        ],
        result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === `/accounts/${accountId}/pages/projects`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: {
          id: "pages-new",
          name: body.name,
          production_branch: body.production_branch,
          subdomain: `${body.name}.pages.dev`,
        },
      });
      return;
    }

    if (request.method === "DELETE" && url.pathname === `/accounts/${accountId}/pages/projects/docs-site`) {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === `/accounts/${accountId}/d1/database`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: [
          {
            uuid: "d1-database-id",
            name: "app-db",
            version: "production",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === `/accounts/${accountId}/d1/database`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: { uuid: "d1-created-id", name: body.name },
      });
      return;
    }

    if (request.method === "DELETE" && url.pathname === `/accounts/${accountId}/d1/database/d1-database-id`) {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === `/accounts/${accountId}/r2/buckets`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: { buckets: [{ name: "assets-bucket", creation_date: "2026-01-01T00:00:00Z" }] },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === `/accounts/${accountId}/r2/buckets`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: { name: body.name, jurisdiction: body.jurisdiction },
      });
      return;
    }

    if (request.method === "DELETE" && url.pathname === `/accounts/${accountId}/r2/buckets/assets-bucket`) {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === `/accounts/${accountId}/storage/kv/namespaces`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: [{ id: "kv_namespace_id", title: "APP_CACHE" }],
        result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === `/accounts/${accountId}/storage/kv/namespaces`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: { id: "kv-created-id", title: body.title },
      });
      return;
    }

    if (request.method === "DELETE" && url.pathname === `/accounts/${accountId}/storage/kv/namespaces/kv_namespace_id`) {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === `/accounts/${accountId}/cfd_tunnel`) {
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: [
          {
            id: "tunnel_id",
            name: "office-tunnel",
            config_src: "cloudflare",
            connections: [{ is_pending_reconnect: false }],
          },
        ],
        result_info: { page: 1, per_page: 50, total_pages: 1, total_count: 1 },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === `/accounts/${accountId}/cfd_tunnel`) {
      assert.equal(typeof body.tunnel_secret, "string");
      assert.ok(body.tunnel_secret.length > 20);
      makeJsonResponse(response, 200, {
        success: true,
        errors: [],
        messages: [],
        result: { id: "tunnel-created-id", name: body.name, config_src: body.config_src },
      });
      return;
    }

    if (request.method === "DELETE" && url.pathname === `/accounts/${accountId}/cfd_tunnel/tunnel_id`) {
      response.writeHead(204);
      response.end();
      return;
    }

    makeJsonResponse(response, 404, {
      success: false,
      errors: [{ message: `${request.method} ${url.pathname} not mocked` }],
      messages: [],
      result: null,
    });
  });
}

test("manages developer platform resources through Cloudflare APIs", async () => {
  const accountId = "1".repeat(32);
  const requests = [];
  const cloudflareMock = createDeveloperResourcesMock({ accountId, requests });
  const mockUrl = await listen(cloudflareMock);
  const panelPort = await allocatePanelPort();
  const panel = startPanel({
    PORT: String(panelPort),
    CLOUDFLARE_API_BASE_URL: mockUrl,
    CLOUDFLARE_EMAIL: "admin@example.com",
    CLOUDFLARE_GLOBAL_API_KEY: "test-key",
  });

  try {
    await waitForHttp(`http://127.0.0.1:${panelPort}/`);

    const cases = [
      ["pages", "docs-site", { name: "new-pages", productionBranch: "main" }],
      ["d1", "d1-database-id", { name: "new-db" }],
      ["r2", "assets-bucket", { name: "new-bucket", jurisdiction: "default" }],
      ["kv", "kv_namespace_id", { name: "NEW_CACHE" }],
      ["tunnels", "tunnel_id", { name: "new-tunnel", configSrc: "cloudflare" }],
    ];

    for (const [type, deleteId, createBody] of cases) {
      const listResponse = await fetch(
        `http://127.0.0.1:${panelPort}/api/developer-resources/${type}`
      );
      const listPayload = await listResponse.json();

      assert.equal(listResponse.status, 200);
      assert.equal(listPayload.resources.accountId, accountId);
      assert.equal(listPayload.resources.type, type);
      assert.equal(listPayload.resources.items.length, 1);

      const createResponse = await fetch(
        `http://127.0.0.1:${panelPort}/api/developer-resources/${type}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createBody),
        }
      );
      const createPayload = await createResponse.json();

      assert.equal(createResponse.status, 201);
      assert.equal(createPayload.resource.type, type);

      const deleteResponse = await fetch(
        `http://127.0.0.1:${panelPort}/api/developer-resources/${type}/${deleteId}`,
        { method: "DELETE" }
      );
      const deletePayload = await deleteResponse.json();

      assert.equal(deleteResponse.status, 200);
      assert.equal(deletePayload.id, deleteId);
    }

    assert.ok(
      requests.some(
        (request) =>
          request.method === "GET" &&
          request.path === `/accounts/${accountId}/pages/projects` &&
          request.query.per_page === "10"
      )
    );
    assert.ok(
      requests.some(
        (request) =>
          request.method === "POST" &&
          request.path === `/accounts/${accountId}/r2/buckets` &&
          request.body.name === "new-bucket"
      )
    );
    assert.ok(
      requests.some(
        (request) =>
          request.method === "POST" &&
          request.path === `/accounts/${accountId}/cfd_tunnel` &&
          request.body.tunnel_secret
      )
    );
  } finally {
    await panel.stop();
    cloudflareMock.close();
  }
});

test("renders developer resource pages and Worker template library", async () => {
  const [{ state, resetDeveloperResourcesState }, { renderDeveloperResourcesView }] =
    await Promise.all([
      import("../public/js/state.js"),
      import("../public/js/views/developer-resources-view.js"),
    ]);

  const app = { className: "", innerHTML: "" };
  global.document = {
    querySelector(selector) {
      assert.equal(selector, "#app");
      return app;
    },
  };

  resetDeveloperResourcesState();
  state.connected = true;
  state.mainSection = "r2";
  state.view = "domains";
  state.sessionEmail = "admin@example.com";
  state.developerResourceLoadedType = "r2";
  state.developerResourceAccounts = [{ id: "1".repeat(32), name: "Test Account" }];
  state.developerResourceItems = [
    {
      id: "assets-bucket",
      name: "assets-bucket",
      badge: "R2",
      description: "assets-bucket bucket",
      meta: [["位置", "Auto"]],
    },
  ];

  renderDeveloperResourcesView();

  assert.match(app.innerHTML, /R2 存储桶/);
  assert.match(app.innerHTML, /新建存储桶/);
  assert.match(app.innerHTML, /assets-bucket/);
  assert.match(app.innerHTML, /查看和管理当前 Cloudflare 账号中的资源/);

  state.mainSection = "templates";
  state.workerTemplates = [
    {
      id: "custom-1",
      name: "自定义模板",
      category: "自定义",
      description: "测试模板",
      script: "export default {};",
      custom: true,
    },
  ];

  renderDeveloperResourcesView();

  assert.match(app.innerHTML, /Worker 脚本模板库/);
  assert.match(app.innerHTML, /Hello World/);
  assert.match(app.innerHTML, /自定义模板/);
  assert.match(app.innerHTML, /使用模板/);
});
