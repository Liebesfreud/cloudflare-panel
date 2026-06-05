import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";
import {
  accountName,
  activeAccountId,
  renderAccountOptions,
  workerDomains,
} from "./helpers.js";

export function renderWorkersToolbar() {
  return `
    <section class="workers-toolbar workers-card">
      <div>
        <h2>Workers</h2>
        <p>创建 Worker 脚本，配置 workers.dev、路由、自定义域和环境变量。</p>
      </div>
      <div class="workers-toolbar-actions">
        <select id="workers-account" ${state.workersLoading || state.workersAccounts.length <= 1 ? "disabled" : ""}>
          ${renderAccountOptions()}
        </select>
        <button class="workers-outline-button" id="workers-refresh" type="button" ${state.workersLoading ? "disabled" : ""}>
          ${icon("refresh")}
          刷新
        </button>
        <button class="workers-primary-button" id="workers-new" type="button" ${state.workersLoading ? "disabled" : ""}>
          ${icon("plus")}
          新建 Worker
        </button>
      </div>
    </section>
  `;
}

export function renderWorkersSummary() {
  const bindingsCount = state.workersList.reduce(
    (total, worker) => total + (Array.isArray(worker.bindings) ? worker.bindings.length : 0),
    0
  );

  return `
    <section class="workers-summary-grid">
      ${[
        ["脚本数量", state.workersList.length],
        ["自定义域", state.workersDomains.length],
        ["当前账号", accountName(activeAccountId()) || "未选择"],
        ["绑定资源", bindingsCount],
      ]
        .map(
          ([label, value]) => `
            <div class="workers-summary-card">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderWorkerRows() {
  if (state.workersLoading && !state.workersLoaded) {
    return `
      <div class="workers-empty">
        <span class="spinner" aria-hidden="true"></span>
        <strong>加载 Workers...</strong>
      </div>
    `;
  }

  if (state.workersList.length === 0) {
    return `
      <div class="workers-empty">
        <span class="workers-empty-icon">${icon("code")}</span>
        <strong>暂无 Workers</strong>
        <p>点击右上角“新建 Worker”创建一个新的 Cloudflare Worker 脚本。</p>
      </div>
    `;
  }

  return `
    <div class="workers-list">
      ${state.workersList
        .map((worker) => {
          const domains = workerDomains(worker.name);
          const modifiedTime = worker.modifiedOn
            ? new Date(worker.modifiedOn).toLocaleString("zh-CN")
            : "未知";

          return `
            <article class="workers-row">
              <div class="workers-row-main">
                <div class="workers-row-title">
                  <span class="workers-row-icon">${icon("code")}</span>
                  <strong>${escapeHtml(worker.name)}</strong>
                  <em>${escapeHtml(worker.usageModel || "workers")}</em>
                </div>
                <div class="workers-row-meta">
                  <span>修改: ${escapeHtml(modifiedTime)}</span>
                  <span>ETag: ${escapeHtml(worker.etag || "-")}</span>
                  <span>自定义域: ${domains.length}</span>
                </div>
              </div>
              <div class="workers-row-actions">
                <button class="workers-outline-button workers-edit" type="button" data-worker-name="${escapeHtml(worker.name)}">
                  ${icon("edit")}
                  编辑
                </button>
                <button class="workers-icon-danger workers-delete-request" type="button" data-worker-name="${escapeHtml(worker.name)}" title="删除" aria-label="删除 ${escapeHtml(worker.name)}">
                  ${icon("trash")}
                </button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderWorkersListPanel() {
  return `
    <section class="workers-card workers-list-card">
      <div class="workers-card-heading">
        <div>
          <h2>Workers 列表</h2>
          <p>查看和管理您的 Cloudflare Workers。</p>
        </div>
      </div>
      ${renderWorkerRows()}
    </section>
  `;
}
