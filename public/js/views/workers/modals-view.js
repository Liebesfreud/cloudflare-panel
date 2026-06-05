import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";
import { renderDomainManager } from "./domain-manager-view.js";
import { activeWorkerName, defaultWorkerScript } from "./helpers.js";

export function renderCreateWorkerModal() {
  if (state.workersModal !== "create") {
    return "";
  }

  return `
    <div class="workers-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="worker-create-title">
      <form class="workers-dialog workers-create-dialog" id="worker-create-form">
        <div class="workers-dialog-header">
          <div>
            <h2 id="worker-create-title">新建 Worker</h2>
            <p>创建一个新的 Cloudflare Worker 脚本</p>
          </div>
          <button class="workers-dialog-close workers-modal-close" type="button" aria-label="关闭">
            ${icon("x")}
          </button>
        </div>
        <label class="workers-field">
          <span>Worker 名称</span>
          <input name="name" placeholder="my-worker" autocomplete="off" spellcheck="false" />
          <small>只能包含小写字母、数字和连字符</small>
        </label>
        <label class="workers-field">
          <span>Worker 脚本代码</span>
          <textarea name="script" spellcheck="false">${escapeHtml(
            state.workersScript || defaultWorkerScript
          )}</textarea>
        </label>
        <div class="workers-dialog-actions">
          <button class="workers-outline-button workers-modal-close" type="button">取消</button>
          <button class="workers-primary-button" type="submit" ${state.workersSaving ? "disabled" : ""}>
            ${state.workersSaving ? "创建中..." : "创建 Worker"}
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderTabs() {
  return `
    <div class="workers-tabs">
      ${[
        ["code", "代码编辑"],
        ["domain", "域名管理"],
      ]
        .map(
          ([tab, label]) => `
            <button
              class="${state.workersActiveTab === tab ? "active" : ""}"
              type="button"
              data-worker-tab="${escapeHtml(tab)}"
            >
              ${escapeHtml(label)}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCodeEditor() {
  return `
    <form class="workers-editor-grid" id="worker-editor-form">
      <label class="workers-field workers-code-field">
        <span>Worker 脚本代码</span>
        <textarea name="script" placeholder="addEventListener('fetch', event => { /* ... */ })" spellcheck="false">${escapeHtml(
          state.workersScript
        )}</textarea>
      </label>
      <div class="workers-dialog-actions">
        <button class="workers-outline-button workers-modal-close" type="button">取消</button>
        <button class="workers-primary-button" type="submit" ${state.workersSaving ? "disabled" : ""}>
          ${state.workersSaving ? "部署中..." : "保存并部署"}
        </button>
      </div>
    </form>
  `;
}

export function renderEditWorkerModal() {
  if (state.workersModal !== "edit") {
    return "";
  }

  const workerName = activeWorkerName();

  return `
    <div class="workers-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="worker-edit-title">
      <section class="workers-dialog workers-edit-dialog">
        <div class="workers-dialog-header">
          <div>
            <h2 id="worker-edit-title">编辑 Worker: ${escapeHtml(workerName)}</h2>
            <p>修改Worker脚本代码、路由和 workers.dev 子域设置</p>
          </div>
          <button class="workers-dialog-close workers-modal-close" type="button" aria-label="关闭">
            ${icon("x")}
          </button>
        </div>
        ${renderTabs()}
        ${state.workersLoadingDetail ? `<div class="workers-loading-detail"><span class="spinner"></span><strong>读取 Worker 配置...</strong></div>` : ""}
        ${
          state.workersLoadingDetail
            ? ""
            : state.workersActiveTab === "domain"
              ? renderDomainManager()
              : renderCodeEditor()
        }
      </section>
    </div>
  `;
}

export function renderDeleteWorkerModal() {
  if (state.workersModal !== "delete") {
    return "";
  }

  return `
    <div class="workers-dialog-backdrop workers-danger-backdrop" role="dialog" aria-modal="true" aria-labelledby="worker-delete-title">
      <section class="workers-dialog workers-delete-dialog">
        <div class="workers-dialog-header">
          <div>
            <h2 id="worker-delete-title">确认删除 Worker</h2>
            <p>此操作将永久删除 Worker 及其相关的路由和 DNS 记录。请输入 Worker 名称确认删除。</p>
          </div>
          <button class="workers-dialog-close workers-modal-close" type="button" aria-label="关闭">
            ${icon("x")}
          </button>
        </div>
        <label class="workers-field">
          <span>Worker 名称</span>
          <input id="worker-delete-confirm-input" value="${escapeHtml(state.workersDeleteConfirm)}" placeholder="${escapeHtml(
            state.workersDeleteName
          )}" autocomplete="off" spellcheck="false" />
        </label>
        <div class="workers-dialog-actions">
          <button class="workers-outline-button workers-modal-close" type="button" id="worker-delete-cancel">取消</button>
          <button class="workers-danger-button" type="button" id="worker-delete-confirm" ${
            state.workersDeleteConfirm === state.workersDeleteName && !state.workersSaving
              ? ""
              : "disabled"
          }>
            ${state.workersSaving ? "删除中..." : "删除"}
          </button>
        </div>
      </section>
    </div>
  `;
}
