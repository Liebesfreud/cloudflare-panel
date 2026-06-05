import {
  pageRuleBrowserCacheTtls,
  pageRuleCacheLevels,
  pageRuleForwardingTypes,
  pageRuleSecurityLevels,
  pageRuleSslModes,
  pageRuleToggleOptions,
} from "../../constants.js";
import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";

function optionList(options, selectedValue) {
  return options
    .map(
      ([value, label]) => `
        <option value="${escapeHtml(value)}" ${String(selectedValue) === String(value) ? "selected" : ""}>
          ${escapeHtml(label)}
        </option>
      `
    )
    .join("");
}

function isRuleExclusive() {
  return Boolean(state.pageRuleForm.forwardingType || state.pageRuleForm.alwaysUseHttps === "on");
}

function renderField({ id, label, name, options, disabled = false, dataExclusive = false }) {
  return `
    <label class="page-rule-field" for="${escapeHtml(id)}">
      <span>${escapeHtml(label)}</span>
      <select
        id="${escapeHtml(id)}"
        name="${escapeHtml(name)}"
        ${disabled ? "disabled" : ""}
        ${dataExclusive ? "data-page-rule-exclusive" : ""}
      >
        ${optionList(options, state.pageRuleForm[name])}
      </select>
    </label>
  `;
}

function renderPageRuleForm() {
  const isEditing = Boolean(state.editingPageRuleId);
  const exclusive = isRuleExclusive();

  return `
    <section class="page-rule-create-box">
      <div class="page-rule-create-heading">
        <h3>${isEditing ? "编辑页面规则" : "创建页面规则"}</h3>
        ${
          isEditing
            ? `<span class="page-rule-edit-badge">编辑模式</span>`
            : ""
        }
      </div>

      ${
        exclusive
          ? `<div class="page-rule-warning">注意：URL转发 和 始终HTTPS 不能与其他设置同时使用</div>`
          : ""
      }

      <form id="page-rule-form" class="page-rule-form">
        <div class="page-rule-grid">
          <label class="page-rule-field span-2" for="page-rule-url-pattern">
            <span>URL 模式 *</span>
            <input
              id="page-rule-url-pattern"
              name="urlPattern"
              value="${escapeHtml(state.pageRuleForm.urlPattern)}"
              placeholder="*.example.com/images/*"
              autocomplete="off"
              ${state.savingPageRule ? "disabled" : ""}
            />
          </label>

          ${renderField({
            id: "page-rule-status",
            label: "规则状态",
            name: "status",
            options: [
              ["active", "启用"],
              ["disabled", "禁用"],
            ],
            disabled: state.savingPageRule,
          })}
        </div>

        <div class="page-rule-grid">
          ${renderField({
            id: "page-rule-cache-level",
            label: "缓存级别",
            name: "cacheLevel",
            options: pageRuleCacheLevels,
            disabled: state.savingPageRule || exclusive,
          })}
          ${renderField({
            id: "page-rule-browser-cache-ttl",
            label: "浏览器缓存",
            name: "browserCacheTtl",
            options: pageRuleBrowserCacheTtls,
            disabled: state.savingPageRule || exclusive,
          })}
          ${renderField({
            id: "page-rule-security-level",
            label: "安全级别",
            name: "securityLevel",
            options: pageRuleSecurityLevels,
            disabled: state.savingPageRule || exclusive,
          })}
        </div>

        <div class="page-rule-grid">
          ${renderField({
            id: "page-rule-ssl",
            label: "SSL 模式",
            name: "ssl",
            options: pageRuleSslModes,
            disabled: state.savingPageRule || exclusive,
          })}
          ${renderField({
            id: "page-rule-always-https",
            label: "始终 HTTPS",
            name: "alwaysUseHttps",
            options: pageRuleToggleOptions,
            disabled: state.savingPageRule || Boolean(state.pageRuleForm.forwardingType),
            dataExclusive: true,
          })}
          ${renderField({
            id: "page-rule-forwarding-type",
            label: "转发类型",
            name: "forwardingType",
            options: pageRuleForwardingTypes,
            disabled: state.savingPageRule || state.pageRuleForm.alwaysUseHttps === "on",
            dataExclusive: true,
          })}
        </div>

        ${
          state.pageRuleForm.forwardingType
            ? `<label class="page-rule-field" for="page-rule-forwarding-url">
                <span>目标 URL</span>
                <input
                  id="page-rule-forwarding-url"
                  name="forwardingUrl"
                  value="${escapeHtml(state.pageRuleForm.forwardingUrl)}"
                  placeholder="https://example.com/new-path"
                  autocomplete="off"
                  ${state.savingPageRule ? "disabled" : ""}
                />
              </label>`
            : ""
        }

        <div class="page-rule-form-actions">
          <button
            class="secondary-button page-rule-form-button"
            type="button"
            id="reset-page-rule-form"
            ${state.savingPageRule ? "disabled" : ""}
          >
            ${isEditing ? "取消" : "重置"}
          </button>
          <button
            class="primary-button page-rule-form-button"
            type="submit"
            ${state.savingPageRule ? "disabled" : ""}
          >
            ${state.savingPageRule ? (isEditing ? "更新中..." : "创建中...") : isEditing ? "更新规则" : "创建规则"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderActionBadge(action, index) {
  if (action.id === "forwarding_url" && action.value && typeof action.value === "object") {
    return `${escapeHtml(`${action.value.status_code} -> ${action.value.url}`)}`;
  }

  if (action.id === "always_use_https") {
    return "Always HTTPS";
  }

  const label = action.id ? action.id.replace(/_/g, " ") : "unknown";
  const value = typeof action.value === "object" ? JSON.stringify(action.value) : action.value;

  return `${escapeHtml(label)}${value !== undefined && value !== "" ? `: ${escapeHtml(String(value))}` : ""}`;
}

function renderRuleItem(rule) {
  const isUpdating = state.updatingPageRuleId === rule.id;
  const isDeleting = state.deletingPageRuleId === rule.id;

  return `
    <article class="page-rule-item">
      <div class="page-rule-item-content">
        <div class="page-rule-status-row">
          <label class="page-rule-switch">
            <input
              class="toggle-page-rule"
              type="checkbox"
              data-rule-id="${escapeHtml(rule.id)}"
              ${rule.status === "active" ? "checked" : ""}
              ${isUpdating || state.savingPageRule ? "disabled" : ""}
            />
            <span></span>
          </label>
          <strong class="${rule.status === "active" ? "enabled" : "disabled"}">
            ${isUpdating ? "更新中" : rule.status === "active" ? "启用" : "禁用"}
          </strong>
          ${rule.priority !== null ? `<em>P${escapeHtml(String(rule.priority))}</em>` : ""}
        </div>

        <p>${escapeHtml(rule.urlPattern || "未设置")}</p>

        <div class="page-rule-action-list">
          ${(rule.actions || [])
            .map(
              (action, index) => `
                <span>${renderActionBadge(action, index)}</span>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="page-rule-item-actions">
        <button
          class="secondary-button page-rule-icon-button edit-page-rule"
          type="button"
          data-rule-id="${escapeHtml(rule.id)}"
          aria-label="编辑页面规则"
          title="编辑"
          ${state.savingPageRule ? "disabled" : ""}
        >
          ${icon("edit")}
        </button>
        <button
          class="secondary-button page-rule-icon-button delete-page-rule"
          type="button"
          data-rule-id="${escapeHtml(rule.id)}"
          aria-label="删除页面规则"
          title="删除"
          ${isDeleting || state.savingPageRule ? "disabled" : ""}
        >
          ${icon("trash")}
        </button>
      </div>
    </article>
  `;
}

function renderExistingRules() {
  if (state.loadingPageRules && state.pageRules.length === 0) {
    return `
      <div class="page-rule-inline-state">
        <div class="spinner"></div>
        <span>正在读取页面规则...</span>
      </div>
    `;
  }

  if (state.pageRulesError) {
    return `
      <div class="page-rule-inline-state error-state">
        <strong>页面规则加载失败</strong>
        <span>${escapeHtml(state.pageRulesError)}</span>
      </div>
    `;
  }

  if (state.pageRules.length === 0) {
    return `<div class="page-rule-empty">暂无页面规则</div>`;
  }

  return `
    <div class="page-rule-list">
      ${state.pageRules.map(renderRuleItem).join("")}
    </div>
  `;
}

export function renderPageRulesSettingsView() {
  const zone = state.selectedZone || { name: "Loading" };

  return `
    <div class="page-rules-page">
      <div class="page-rule-back-row">
        <button class="page-rule-back-button" type="button" id="back-to-domains">← 返回域名列表</button>
      </div>

      ${state.notice ? `<div class="notice page-notice">${escapeHtml(state.notice)}</div>` : ""}

      <section class="panel page-rules-panel">
        <div class="page-rules-heading">
          <h2>
            <span>${icon("settings")}</span>
            页面规则管理
          </h2>
          <p>当前域名: ${escapeHtml(zone.name || "Loading")}</p>
        </div>

        <div class="page-rules-body">
          ${renderPageRuleForm()}

          <section class="page-rule-existing">
            <div class="page-rule-existing-heading">
              <h3>现有规则</h3>
              <button
                class="secondary-button page-rule-refresh"
                type="button"
                id="refresh-page-rules"
                ${state.loadingPageRules ? "disabled" : ""}
              >
                ${state.loadingPageRules ? "加载中" : "刷新"}
              </button>
            </div>
            ${renderExistingRules()}
          </section>
        </div>
      </section>
    </div>
  `;
}
