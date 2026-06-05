import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";
import { renderShell } from "./shell-view.js";

const statusLabels = {
  failed: "失败",
  success: "成功",
};

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("zh-CN");
}

function renderModuleOptions() {
  return state.operationHistoryFilters.modules
    .map(
      (module) => `
        <option value="${escapeHtml(module)}" ${module === state.operationHistoryModule ? "selected" : ""}>
          ${escapeHtml(module)}
        </option>
      `
    )
    .join("");
}

function renderRows() {
  if (state.operationHistoryLoading && state.operationHistory.length === 0) {
    return `
      <div class="history-empty">
        <span class="spinner" aria-hidden="true"></span>
        <strong>正在读取操作历史</strong>
      </div>
    `;
  }

  if (state.operationHistory.length === 0) {
    return `
      <div class="history-empty">
        <span class="history-empty-icon">${icon("history")}</span>
        <strong>暂无操作记录</strong>
        <p>执行 DNS、SSL、缓存、防火墙、Workers 或资源管理操作后会显示在这里。</p>
      </div>
    `;
  }

  return `
    <div class="history-table">
      <div class="history-row history-head">
        <span>时间</span>
        <span>模块</span>
        <span>动作</span>
        <span>资源</span>
        <span>结果</span>
        <span>耗时</span>
      </div>
      ${state.operationHistory
        .map(
          (entry) => `
            <div class="history-row">
              <span class="history-time">${escapeHtml(formatDate(entry.createdAt))}</span>
              <span>${escapeHtml(entry.module)}</span>
              <span>
                <em class="history-method">${escapeHtml(entry.method)}</em>
                ${escapeHtml(entry.action)}
              </span>
              <span class="history-resource" title="${escapeHtml(entry.path)}">
                ${escapeHtml(entry.resource || entry.path)}
              </span>
              <span>
                <em class="history-status ${entry.status === "failed" ? "failed" : "success"}">
                  ${escapeHtml(statusLabels[entry.status] || entry.status)}
                </em>
                ${
                  entry.error
                    ? `<small title="${escapeHtml(entry.error)}">${escapeHtml(entry.error)}</small>`
                    : ""
                }
              </span>
              <span>${escapeHtml(entry.durationMs)}ms</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function renderHistoryView() {
  const successCount = state.operationHistory.filter((entry) => entry.status === "success").length;
  const failedCount = state.operationHistory.filter((entry) => entry.status === "failed").length;

  renderShell(`
    <section class="history-content">
      <div class="history-scroll-shell">
        <section class="history-card history-toolbar">
          <div>
            <h2>操作历史</h2>
            <p>记录当前服务进程内的面板写操作，不保存请求体和敏感字段。</p>
          </div>
          <div class="history-toolbar-actions">
            <button class="history-outline-button" id="history-refresh" type="button" ${state.operationHistoryLoading ? "disabled" : ""}>
              ${icon("refresh")}
              刷新
            </button>
            <button class="history-danger-button" id="history-clear" type="button" ${state.operationHistoryLoading || state.operationHistory.length === 0 ? "disabled" : ""}>
              ${icon("trash")}
              清空
            </button>
          </div>
        </section>

        <section class="history-summary-grid">
          <div class="history-summary-card">
            <span>当前显示</span>
            <strong>${escapeHtml(state.operationHistory.length)}</strong>
          </div>
          <div class="history-summary-card">
            <span>成功</span>
            <strong>${escapeHtml(successCount)}</strong>
          </div>
          <div class="history-summary-card">
            <span>失败</span>
            <strong>${escapeHtml(failedCount)}</strong>
          </div>
          <div class="history-summary-card">
            <span>筛选模块</span>
            <strong>${escapeHtml(state.operationHistoryModule || "全部")}</strong>
          </div>
        </section>

        <section class="history-card history-filter-card">
          <label>
            <span>模块</span>
            <select data-history-filter="module" ${state.operationHistoryLoading ? "disabled" : ""}>
              <option value="">全部模块</option>
              ${renderModuleOptions()}
            </select>
          </label>
          <label>
            <span>结果</span>
            <select data-history-filter="status" ${state.operationHistoryLoading ? "disabled" : ""}>
              <option value="">全部结果</option>
              <option value="success" ${state.operationHistoryStatus === "success" ? "selected" : ""}>成功</option>
              <option value="failed" ${state.operationHistoryStatus === "failed" ? "selected" : ""}>失败</option>
            </select>
          </label>
          <label>
            <span>条数</span>
            <select data-history-filter="limit" ${state.operationHistoryLoading ? "disabled" : ""}>
              ${["20", "50", "80", "150", "300"]
                .map(
                  (limit) => `
                    <option value="${limit}" ${state.operationHistoryLimit === limit ? "selected" : ""}>
                      ${limit} 条
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
        </section>

        ${state.operationHistoryNotice ? `<div class="history-notice">${escapeHtml(state.operationHistoryNotice)}</div>` : ""}

        <section class="history-card history-list-card">
          <div class="history-card-heading">
            <div>
              <h2>最近操作</h2>
              <p>服务重启后历史会清空，适合作为当前会话的操作审计。</p>
            </div>
            ${state.operationHistoryLoading ? `<span class="spinner" aria-hidden="true"></span>` : ""}
          </div>
          ${renderRows()}
        </section>
      </div>
    </section>
  `);
}
