import { navFeatureMeta, navItems } from "../constants.js";
import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";
import { renderShell } from "./shell-view.js";

const cloudflareResourceTypes = new Set(["pages", "d1", "r2", "kv", "tunnels"]);

const resourceCopy = {
  pages: {
    action: "新建 Pages",
    empty: "暂无 Pages 项目",
    formTitle: "新建 Pages 项目",
    formDesc: "创建一个 Cloudflare Pages 项目",
    nameLabel: "项目名称",
    namePlaceholder: "my-pages",
    extraLabel: "生产分支",
    extraName: "productionBranch",
    extraPlaceholder: "main",
    deleteTitle: "确认删除 Pages 项目",
  },
  d1: {
    action: "新建数据库",
    empty: "暂无 D1 数据库",
    formTitle: "新建 D1 数据库",
    formDesc: "创建一个 Cloudflare D1 SQL 数据库",
    nameLabel: "数据库名称",
    namePlaceholder: "app-db",
    deleteTitle: "确认删除 D1 数据库",
  },
  r2: {
    action: "新建存储桶",
    empty: "暂无 R2 存储桶",
    formTitle: "新建 R2 存储桶",
    formDesc: "创建一个 Cloudflare R2 对象存储桶",
    nameLabel: "存储桶名称",
    namePlaceholder: "media-assets",
    extraLabel: "区域管辖",
    extraName: "jurisdiction",
    deleteTitle: "确认删除 R2 存储桶",
  },
  kv: {
    action: "新建命名空间",
    empty: "暂无 KV 命名空间",
    formTitle: "新建 KV 命名空间",
    formDesc: "创建一个 Workers KV 命名空间",
    nameLabel: "命名空间名称",
    namePlaceholder: "APP_CACHE",
    deleteTitle: "确认删除 KV 命名空间",
  },
  tunnels: {
    action: "新建 Tunnel",
    empty: "暂无 Tunnel",
    formTitle: "新建 Cloudflare Tunnel",
    formDesc: "创建一个由 Cloudflare 管理配置的 Tunnel",
    nameLabel: "Tunnel 名称",
    namePlaceholder: "office-tunnel",
    extraLabel: "配置源",
    extraName: "configSrc",
    deleteTitle: "确认删除 Tunnel",
  },
};

const builtinTemplates = [
  {
    id: "hello-world",
    name: "Hello World",
    category: "基础",
    description: "返回一个最小 Worker 响应，用于测试部署链路。",
    script: `addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World!'));
});`,
  },
  {
    id: "json-api",
    name: "JSON API",
    category: "接口",
    description: "返回 JSON 数据并附带标准响应头。",
    script: `export default {
  async fetch() {
    return Response.json({ ok: true, message: 'Hello from Worker' });
  },
};`,
  },
  {
    id: "cache-proxy",
    name: "缓存反代",
    category: "缓存",
    description: "演示 fetch 源站并追加边缘缓存策略。",
    script: `export default {
  async fetch(request) {
    const response = await fetch(request, {
      cf: { cacheEverything: true, cacheTtl: 300 },
    });
    return new Response(response.body, response);
  },
};`,
  },
];

function currentMeta() {
  const meta = navFeatureMeta[state.mainSection] || navFeatureMeta.pages;
  const nav = navItems.find(([id]) => id === state.mainSection);

  return {
    iconName: nav?.[1] || "grid",
    label: nav?.[2] || meta.title,
    ...meta,
  };
}

function activeAccountId() {
  return state.developerResourceAccountId || state.developerResourceAccounts[0]?.id || "";
}

function renderAccountOptions() {
  return state.developerResourceAccounts
    .map(
      (account) => `
        <option value="${escapeHtml(account.id)}" ${account.id === activeAccountId() ? "selected" : ""}>
          ${escapeHtml(account.name || account.id)}
        </option>
      `
    )
    .join("");
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("zh-CN") : "未知";
}

function renderNotice() {
  if (!state.developerResourceNotice && !state.workerTemplateNotice) {
    return "";
  }

  return `
    <div class="devres-notice">
      ${escapeHtml(state.developerResourceNotice || state.workerTemplateNotice)}
    </div>
  `;
}

function renderResourceToolbar(type, meta) {
  const copy = resourceCopy[type];

  return `
    <section class="devres-toolbar devres-card">
      <div>
        <h2>${escapeHtml(meta.label)}</h2>
        <p>${escapeHtml(meta.description)}</p>
      </div>
      <div class="devres-toolbar-actions">
        <select id="devres-account" ${state.developerResourceLoading || state.developerResourceAccounts.length <= 1 ? "disabled" : ""}>
          ${renderAccountOptions()}
        </select>
        <button class="devres-outline-button" id="devres-refresh" type="button" ${state.developerResourceLoading ? "disabled" : ""}>
          ${icon("refresh")}
          刷新
        </button>
        <button class="devres-primary-button" id="devres-new" type="button" ${state.developerResourceLoading ? "disabled" : ""}>
          ${icon("plus")}
          ${escapeHtml(copy.action)}
        </button>
      </div>
    </section>
  `;
}

function renderSummary(type) {
  return `
    <section class="devres-summary-grid">
      ${[
        ["资源类型", resourceCopy[type]?.formTitle?.replace(/^新建\s*/, "") || type],
        ["资源数量", state.developerResourceItems.length],
        ["当前账号", state.developerResourceAccounts.find((account) => account.id === activeAccountId())?.name || "未选择"],
        ["状态", state.developerResourceLoading ? "同步中" : "已就绪"],
      ]
        .map(
          ([label, value]) => `
            <div class="devres-summary-card">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderResourceRows(type) {
  if (state.developerResourceLoading && state.developerResourceItems.length === 0) {
    return `
      <div class="devres-empty">
        <span class="spinner" aria-hidden="true"></span>
        <strong>加载资源...</strong>
      </div>
    `;
  }

  if (state.developerResourceItems.length === 0) {
    return `
      <div class="devres-empty">
        <span class="devres-empty-icon">${icon("archive")}</span>
        <strong>${escapeHtml(resourceCopy[type].empty)}</strong>
        <p>点击右上角创建资源，或刷新同步 Cloudflare 当前账号数据。</p>
      </div>
    `;
  }

  return `
    <div class="devres-list">
      ${state.developerResourceItems
        .map(
          (item) => `
            <article class="devres-row">
              <div class="devres-row-main">
                <div class="devres-row-title">
                  <span class="devres-row-icon">${icon("grid")}</span>
                  <strong>${escapeHtml(item.name)}</strong>
                  <em>${escapeHtml(item.badge || "active")}</em>
                </div>
                <p>${escapeHtml(item.description || item.id || "-")}</p>
                <div class="devres-row-meta">
                  ${(item.meta || [])
                    .slice(0, 3)
                    .map(
                      ([label, value]) => `
                        <span>${escapeHtml(label)}: ${escapeHtml(value)}</span>
                      `
                    )
                    .join("")}
                  <span>创建: ${escapeHtml(formatDate(item.createdOn))}</span>
                </div>
              </div>
              <button
                class="devres-icon-danger devres-delete-request"
                type="button"
                data-devres-id="${escapeHtml(item.id)}"
                data-devres-name="${escapeHtml(item.name)}"
                title="删除"
                aria-label="删除 ${escapeHtml(item.name)}"
              >
                ${icon("trash")}
              </button>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCreateModal(type) {
  if (state.developerResourceModal !== "create") {
    return "";
  }

  const copy = resourceCopy[type];
  const extraField =
    type === "r2"
      ? `
        <label class="devres-field">
          <span>${escapeHtml(copy.extraLabel)}</span>
          <select name="jurisdiction">
            <option value="default">默认</option>
            <option value="eu">EU</option>
            <option value="fedramp">FedRAMP</option>
          </select>
        </label>
      `
      : type === "tunnels"
        ? `
          <label class="devres-field">
            <span>${escapeHtml(copy.extraLabel)}</span>
            <select name="configSrc">
              <option value="cloudflare">Cloudflare 托管</option>
              <option value="local">本地配置</option>
            </select>
          </label>
        `
        : copy.extraName
          ? `
            <label class="devres-field">
              <span>${escapeHtml(copy.extraLabel)}</span>
              <input name="${escapeHtml(copy.extraName)}" placeholder="${escapeHtml(copy.extraPlaceholder || "")}" autocomplete="off" spellcheck="false" />
            </label>
          `
          : "";

  return `
    <div class="devres-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="devres-create-title">
      <form class="devres-dialog" id="devres-create-form">
        <div class="devres-dialog-header">
          <div>
            <h2 id="devres-create-title">${escapeHtml(copy.formTitle)}</h2>
            <p>${escapeHtml(copy.formDesc)}</p>
          </div>
          <button class="devres-dialog-close devres-modal-close" type="button" aria-label="关闭">${icon("x")}</button>
        </div>
        <label class="devres-field">
          <span>${escapeHtml(copy.nameLabel)}</span>
          <input name="name" placeholder="${escapeHtml(copy.namePlaceholder)}" autocomplete="off" spellcheck="false" />
        </label>
        ${extraField}
        <div class="devres-dialog-actions">
          <button class="devres-outline-button devres-modal-close" type="button">取消</button>
          <button class="devres-primary-button" type="submit" ${state.developerResourceSaving ? "disabled" : ""}>
            ${state.developerResourceSaving ? "创建中..." : "创建"}
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderDeleteModal(type) {
  if (state.developerResourceModal !== "delete") {
    return "";
  }

  const copy = resourceCopy[type];

  return `
    <div class="devres-dialog-backdrop devres-danger-backdrop" role="dialog" aria-modal="true" aria-labelledby="devres-delete-title">
      <section class="devres-dialog devres-delete-dialog">
        <div class="devres-dialog-header">
          <div>
            <h2 id="devres-delete-title">${escapeHtml(copy.deleteTitle)}</h2>
            <p>此操作会删除 Cloudflare 账号中的真实资源。请输入资源名称确认删除。</p>
          </div>
          <button class="devres-dialog-close devres-modal-close" type="button" aria-label="关闭">${icon("x")}</button>
        </div>
        <label class="devres-field">
          <span>资源名称</span>
          <input id="devres-delete-confirm-input" value="${escapeHtml(state.developerResourceDeleteConfirm)}" placeholder="${escapeHtml(
            state.developerResourceDeleteName
          )}" autocomplete="off" spellcheck="false" />
        </label>
        <div class="devres-dialog-actions">
          <button class="devres-outline-button devres-modal-close" type="button">取消</button>
          <button class="devres-danger-button" id="devres-delete-confirm" type="button" ${
            state.developerResourceDeleteConfirm === state.developerResourceDeleteName &&
            !state.developerResourceSaving
              ? ""
              : "disabled"
          }>
            ${state.developerResourceSaving ? "删除中..." : "删除"}
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderCloudflareResourceView(type, meta) {
  return `
    <section class="content devres-content">
      <div class="devres-scroll-shell">
        ${renderNotice()}
        ${renderResourceToolbar(type, meta)}
        ${renderSummary(type)}
        <section class="devres-card devres-list-card">
          <div class="devres-card-heading">
            <div>
              <h2>${escapeHtml(meta.label)}</h2>
              <p>查看和管理当前 Cloudflare 账号中的资源。</p>
            </div>
          </div>
          ${renderResourceRows(type)}
        </section>
      </div>
    </section>
    ${renderCreateModal(type)}
    ${renderDeleteModal(type)}
  `;
}

function templateItems() {
  const custom = Array.isArray(state.workerTemplates) ? state.workerTemplates : [];
  return [...builtinTemplates, ...custom];
}

function renderTemplatesView(meta) {
  return `
    <section class="content devres-content">
      <div class="devres-scroll-shell">
        ${renderNotice()}
        <section class="devres-toolbar devres-card">
          <div>
            <h2>${escapeHtml(meta.label)}</h2>
            <p>${escapeHtml(meta.description)}</p>
          </div>
          <div class="devres-toolbar-actions">
            <button class="devres-outline-button" id="template-refresh" type="button">
              ${icon("refresh")}
              重载
            </button>
            <button class="devres-primary-button" id="template-new" type="button">
              ${icon("plus")}
              新建模板
            </button>
          </div>
        </section>
        <section class="devres-card devres-list-card">
          <div class="devres-card-heading">
            <div>
              <h2>Worker 脚本模板库</h2>
              <p>保存和复用常用的 Worker 脚本。</p>
            </div>
          </div>
          <div class="template-grid">
            ${templateItems()
              .map(
                (template) => `
                  <article class="template-card">
                    <div>
                      <span>${escapeHtml(template.category || "通用")}</span>
                      <h3>${escapeHtml(template.name)}</h3>
                      <p>${escapeHtml(template.description)}</p>
                    </div>
                    <pre>${escapeHtml(template.script).slice(0, 220)}</pre>
                    <div class="template-actions">
                      <button class="devres-outline-button template-use" type="button" data-template-id="${escapeHtml(template.id)}">
                        ${icon("upload")}
                        使用模板
                      </button>
                      ${
                        template.custom
                          ? `<button class="devres-icon-danger template-delete" type="button" data-template-id="${escapeHtml(template.id)}">${icon("trash")}</button>`
                          : ""
                      }
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      </div>
    </section>
    ${renderTemplateModal()}
  `;
}

function renderTemplateModal() {
  if (state.workerTemplateModal !== "create") {
    return "";
  }

  return `
    <div class="devres-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="template-create-title">
      <form class="devres-dialog template-dialog" id="template-create-form">
        <div class="devres-dialog-header">
          <div>
            <h2 id="template-create-title">新建 Worker 模板</h2>
            <p>保存常用脚本，后续可直接带入新建 Worker 弹窗。</p>
          </div>
          <button class="devres-dialog-close template-modal-close" type="button" aria-label="关闭">${icon("x")}</button>
        </div>
        <label class="devres-field">
          <span>模板名称</span>
          <input name="name" placeholder="Auth Proxy" autocomplete="off" spellcheck="false" />
        </label>
        <label class="devres-field">
          <span>模板分类</span>
          <input name="category" placeholder="鉴权" autocomplete="off" spellcheck="false" />
        </label>
        <label class="devres-field">
          <span>描述</span>
          <input name="description" placeholder="说明这个模板适合什么场景" autocomplete="off" spellcheck="false" />
        </label>
        <label class="devres-field">
          <span>脚本内容</span>
          <textarea name="script" spellcheck="false">export default {
  async fetch() {
    return new Response('Hello from template');
  },
};</textarea>
        </label>
        <div class="devres-dialog-actions">
          <button class="devres-outline-button template-modal-close" type="button">取消</button>
          <button class="devres-primary-button" type="submit">保存模板</button>
        </div>
      </form>
    </div>
  `;
}

export function renderDeveloperResourcesView() {
  const type = state.mainSection;
  const meta = currentMeta();

  renderShell(
    cloudflareResourceTypes.has(type)
      ? renderCloudflareResourceView(type, meta)
      : renderTemplatesView(meta)
  );
}
