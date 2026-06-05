import { firewallActions, firewallRuleTypes } from "../../constants.js";
import { firewallExpressionExamples } from "../../firewall-examples.js";
import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";

const actionClassNames = {
  allow: "allow",
  block: "block",
  challenge: "challenge",
  js_challenge: "js-challenge",
  managed_challenge: "managed-challenge",
  log: "log",
};

function getSelectedRuleType() {
  return (
    firewallRuleTypes.find((type) => type.value === state.firewallForm.type) ||
    firewallRuleTypes[0]
  );
}

function renderRuleTypeOptions() {
  return firewallRuleTypes
    .map(
      (type) => `
        <option value="${escapeHtml(type.value)}" ${type.value === state.firewallForm.type ? "selected" : ""}>
          ${escapeHtml(type.label)}
        </option>
      `
    )
    .join("");
}

function renderActionOptions() {
  return firewallActions
    .map(
      ([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === state.firewallForm.action ? "selected" : ""}>
          ${escapeHtml(label)}
        </option>
      `
    )
    .join("");
}

function renderExpressionExamples() {
  if (!state.showFirewallExamples) {
    return "";
  }

  return `
    <div class="firewall-examples">
      <h4>表达式示例</h4>
      ${firewallExpressionExamples
        .map(
          (group, groupIndex) => `
            <section class="firewall-example-group">
              <div class="firewall-example-group-title">${escapeHtml(group.title)}</div>
              <div class="firewall-example-list">
                ${group.items
                  .map(
                    (example, itemIndex) => `
                      <button
                        class="firewall-example-button"
                        type="button"
                        data-firewall-example="${groupIndex}:${itemIndex}"
                      >
                        <span>${escapeHtml(example.title)}</span>
                        <code>${escapeHtml(example.expression)}</code>
                        ${
                          example.note || example.warning
                            ? `<em class="${example.warning ? "warning" : ""}">${escapeHtml(example.warning || example.note)}</em>`
                            : ""
                        }
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
        )
        .join("")}
      <div class="firewall-expression-help">
        <strong>使用提示：</strong>
        <span>使用 <code>and</code> 表示并且，<code>or</code> 表示或者，<code>not</code> 表示取反。字符串值需要使用双引号。</span>
      </div>
      <div class="firewall-rate-note">
        <strong>关于 CC 攻击防护（速率限制）：</strong>
        <span>防止 CC 攻击需要使用 Cloudflare Rate Limiting Rules，可在后续功能中单独接入。</span>
      </div>
    </div>
  `;
}

function renderTargetField() {
  const selectedType = getSelectedRuleType();
  const isCustomExpression = state.firewallForm.type === "custom";

  if (isCustomExpression) {
    return `
      <div class="firewall-field">
        <div class="firewall-label-row">
          <label for="firewall-rule-target">自定义表达式</label>
          <button
            class="firewall-ghost-mini"
            type="button"
            id="toggle-firewall-examples"
            ${state.savingFirewallRule ? "disabled" : ""}
          >
            ${state.showFirewallExamples ? "隐藏示例" : "查看示例"}
          </button>
        </div>
        <textarea
          id="firewall-rule-target"
          name="target"
          autocomplete="off"
          spellcheck="false"
          placeholder="例如: (http.user_agent contains &quot;sqlmap&quot;) or (http.user_agent contains &quot;nmap&quot;)"
          ${state.savingFirewallRule ? "disabled" : ""}
        >${escapeHtml(state.firewallForm.target)}</textarea>
      </div>
      <label class="firewall-field" for="firewall-rule-description">
        <span>规则描述（可选）</span>
        <input
          id="firewall-rule-description"
          name="description"
          value="${escapeHtml(state.firewallForm.description || "")}"
          autocomplete="off"
          placeholder="例如: 阻止恶意扫描器"
          ${state.savingFirewallRule ? "disabled" : ""}
        />
      </label>
      ${renderExpressionExamples()}
    `;
  }

  return `
    <label class="firewall-field" for="firewall-rule-target">
      <span>${escapeHtml(selectedType.targetLabel)}</span>
      <input
        id="firewall-rule-target"
        name="target"
        value="${escapeHtml(state.firewallForm.target)}"
        autocomplete="off"
        spellcheck="false"
        placeholder="${escapeHtml(selectedType.placeholder)}"
        ${state.savingFirewallRule ? "disabled" : ""}
      />
    </label>
  `;
}

function renderFirewallForm() {
  const isEditing = Boolean(state.editingFirewallRuleId);
  const submitText = isEditing ? "更新规则" : "创建规则";
  const savingText = isEditing ? "更新中..." : "创建中...";

  return `
    <section class="firewall-create-box">
      <h3>${isEditing ? "编辑防火墙规则" : "创建防火墙规则"}</h3>
      <form id="firewall-rule-form" class="firewall-form">
        <label class="firewall-field" for="firewall-rule-type">
          <span>规则类型</span>
          <select name="type" id="firewall-rule-type" ${state.savingFirewallRule ? "disabled" : ""}>
            ${renderRuleTypeOptions()}
          </select>
        </label>

        <label class="firewall-field" for="firewall-rule-action">
          <span>动作</span>
          <select name="action" id="firewall-rule-action" ${state.savingFirewallRule ? "disabled" : ""}>
            ${renderActionOptions()}
          </select>
        </label>

        ${renderTargetField()}

        <div class="firewall-form-actions">
          ${
            isEditing
              ? `<button class="secondary-button firewall-form-button" type="button" id="reset-firewall-form" ${state.savingFirewallRule ? "disabled" : ""}>取消</button>`
              : ""
          }
          <button class="primary-button firewall-form-button" type="submit" ${state.savingFirewallRule ? "disabled" : ""}>
            ${state.savingFirewallRule ? savingText : submitText}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderRuleMeta(rule) {
  const meta = [];

  if (rule.id) {
    meta.push(["ID:", `${rule.id.slice(0, 8)}...`]);
  }

  if (rule.filterId) {
    meta.push(["Filter ID:", `${rule.filterId.slice(0, 8)}...`]);
  }

  if (rule.createdOn) {
    meta.push(["创建:", new Date(rule.createdOn).toLocaleString("zh-CN")]);
  }

  if (rule.modifiedOn && rule.modifiedOn !== rule.createdOn) {
    meta.push(["修改:", new Date(rule.modifiedOn).toLocaleString("zh-CN")]);
  }

  return meta
    .map(
      ([label, value]) => `
        <span>
          <strong>${escapeHtml(label)}</strong>
          <code>${escapeHtml(value)}</code>
        </span>
      `
    )
    .join("");
}

function renderRuleCard(rule) {
  const actionClass = actionClassNames[String(rule.action || "").toLowerCase()] || "unknown";
  const actionText = String(rule.action || "unknown").toUpperCase();
  const isUpdating = state.updatingFirewallRuleId === rule.id;
  const isDeleting = state.deletingFirewallRuleId === rule.id;
  const isEnabled = !rule.paused;

  return `
    <article class="firewall-rule-card">
      <div class="firewall-rule-content">
        <div class="firewall-rule-title-row">
          <strong>${escapeHtml(rule.description || "未命名规则")}</strong>
          <span class="firewall-action-badge ${actionClass}">${escapeHtml(actionText)}</span>
          <span class="firewall-status-badge ${isEnabled ? "enabled" : "paused"}">
            ${isEnabled ? `${icon("check")} 已启用` : `${icon("pause")} 已暂停`}
          </span>
        </div>

        ${
          rule.filterDescription && rule.filterDescription !== rule.description
            ? `<div class="firewall-filter-description"><strong>过滤器：</strong>${escapeHtml(rule.filterDescription)}</div>`
            : ""
        }

        <div class="firewall-expression-box">
          <span>表达式：</span>
          <code>${escapeHtml(rule.expression || "N/A")}</code>
        </div>

        <div class="firewall-rule-meta">
          ${renderRuleMeta(rule)}
        </div>
      </div>

      <div class="firewall-rule-actions">
        <button
          class="secondary-button firewall-rule-button toggle-firewall-rule"
          type="button"
          data-rule-id="${escapeHtml(rule.id)}"
          title="${isEnabled ? "暂停规则" : "启用规则"}"
          ${isUpdating || state.savingFirewallRule ? "disabled" : ""}
        >
          ${isUpdating ? "处理中..." : isEnabled ? "暂停" : "启用"}
        </button>
        <button
          class="secondary-button firewall-icon-action edit-firewall-rule"
          type="button"
          data-rule-id="${escapeHtml(rule.id)}"
          title="编辑规则"
          aria-label="编辑规则"
          ${state.savingFirewallRule ? "disabled" : ""}
        >
          ${icon("edit")}
        </button>
        <button
          class="secondary-button firewall-icon-action delete-firewall-rule"
          type="button"
          data-rule-id="${escapeHtml(rule.id)}"
          title="删除规则"
          aria-label="删除规则"
          ${isDeleting || state.savingFirewallRule ? "disabled" : ""}
        >
          ${icon("trash")}
        </button>
      </div>
    </article>
  `;
}

function renderRulesList() {
  if (state.loadingFirewallRules && state.firewallRules.length === 0) {
    return `
      <div class="firewall-inline-state">
        <div class="spinner"></div>
        <span>正在读取防火墙规则...</span>
      </div>
    `;
  }

  if (state.firewallError) {
    return `
      <div class="firewall-inline-state error-state">
        <strong>防火墙规则加载失败</strong>
        <span>${escapeHtml(state.firewallError)}</span>
      </div>
    `;
  }

  if (state.firewallRules.length === 0) {
    return `
      <div class="firewall-empty-state">
        <span class="firewall-empty-icon">${icon("shield")}</span>
        <p>暂无防火墙规则</p>
        <small>创建规则后将在此处显示</small>
      </div>
    `;
  }

  return `
    <div class="firewall-rule-list">
      ${state.firewallRules.map((rule) => renderRuleCard(rule)).join("")}
    </div>
  `;
}

function rulesetRules(phase) {
  return state.firewallRulesets?.[phase]?.rules || [];
}

function renderFirewallWarnings() {
  if (!state.firewallWarnings.length) {
    return "";
  }

  return `
    <div class="firewall-warning-list">
      ${state.firewallWarnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
    </div>
  `;
}

function renderRulesetForm() {
  return `
    <section class="firewall-create-box">
      <h3>新版 WAF / 速率限制</h3>
      <form id="ruleset-rule-form" class="firewall-form">
        <label class="firewall-field">
          <span>规则阶段</span>
          <select name="phase">
            <option value="http_request_firewall_custom">自定义 WAF 规则</option>
            <option value="http_ratelimit">Rate Limiting / 防 CC</option>
          </select>
        </label>
        <label class="firewall-field">
          <span>动作</span>
          <select name="action">
            <option value="block">阻止</option>
            <option value="managed_challenge">托管质询</option>
            <option value="challenge">质询</option>
            <option value="js_challenge">JS 质询</option>
            <option value="log">仅记录</option>
          </select>
        </label>
        <label class="firewall-field">
          <span>规则描述</span>
          <input name="description" placeholder="例如: 防 CC 访问首页" />
        </label>
        <label class="firewall-field">
          <span>表达式</span>
          <textarea name="expression" placeholder='例如: (http.request.uri.path eq "/")'></textarea>
        </label>
        <div class="firewall-rate-grid">
          <label class="firewall-field">
            <span>周期请求数</span>
            <input name="requestsPerPeriod" type="number" min="1" value="60" />
          </label>
          <label class="firewall-field">
            <span>统计周期</span>
            <select name="period">
              <option value="10">10 秒</option>
              <option value="60" selected>60 秒</option>
            </select>
          </label>
          <label class="firewall-field">
            <span>缓解时长</span>
            <input name="mitigationTimeout" type="number" min="0" value="600" />
          </label>
        </div>
        <div class="firewall-form-actions">
          <button class="primary-button firewall-form-button" type="submit" ${state.savingRulesetRule ? "disabled" : ""}>
            ${state.savingRulesetRule ? "创建中..." : "创建新版规则"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderRulesetList(title, phase, emptyText) {
  const rules = rulesetRules(phase);
  const rulesetId = state.firewallRulesets?.[phase]?.id || "";

  return `
    <section class="firewall-rules-section">
      <div class="firewall-rules-heading">
        <h3>${escapeHtml(title)}</h3>
      </div>
      ${
        rules.length === 0
          ? `<div class="firewall-empty-state"><p>${escapeHtml(emptyText)}</p></div>`
          : `<div class="firewall-rule-list">
              ${rules
                .map(
                  (rule) => `
                    <article class="firewall-rule-card">
                      <div class="firewall-rule-content">
                        <div class="firewall-rule-title-row">
                          <strong>${escapeHtml(rule.description || rule.id)}</strong>
                          <span class="firewall-action-badge ${escapeHtml(actionClassNames[rule.action] || "unknown")}">${escapeHtml(String(rule.action || "").toUpperCase())}</span>
                          <span class="firewall-status-badge ${rule.enabled ? "enabled" : "paused"}">${rule.enabled ? `${icon("check")} 已启用` : `${icon("pause")} 已禁用`}</span>
                        </div>
                        <div class="firewall-expression-box">
                          <span>表达式：</span>
                          <code>${escapeHtml(rule.expression || "-")}</code>
                        </div>
                        ${
                          rule.ratelimit
                            ? `<div class="firewall-rule-meta">
                                <span><strong>请求数:</strong><code>${escapeHtml(rule.ratelimit.requests_per_period)}</code></span>
                                <span><strong>周期:</strong><code>${escapeHtml(rule.ratelimit.period)}s</code></span>
                                <span><strong>缓解:</strong><code>${escapeHtml(rule.ratelimit.mitigation_timeout)}s</code></span>
                              </div>`
                            : ""
                        }
                      </div>
                      <div class="firewall-rule-actions">
                        <button
                          class="secondary-button firewall-icon-action delete-ruleset-rule"
                          type="button"
                          data-rule-id="${escapeHtml(rule.id)}"
                          data-ruleset-id="${escapeHtml(rule.rulesetId || rulesetId)}"
                          ${state.deletingFirewallRuleId === rule.id ? "disabled" : ""}
                          title="删除新版规则"
                        >
                          ${icon("trash")}
                        </button>
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>`
      }
    </section>
  `;
}

export function renderFirewallSettingsView() {
  const zone = state.selectedZone || { id: "", name: "", status: "", plan: null };

  return `
    <div class="firewall-page">
      <div class="firewall-back-row">
        <button class="firewall-back-button" type="button" id="back-to-domains">← 返回域名列表</button>
      </div>

      ${state.notice ? `<div class="notice page-notice">${escapeHtml(state.notice)}</div>` : ""}

      <section class="panel firewall-panel">
        <div class="firewall-panel-heading">
          <div>
            <h2>
              <span>${icon("shield")}</span>
              防火墙规则管理
            </h2>
            <p>当前域名: ${escapeHtml(zone.name || "Loading")}</p>
          </div>
        </div>

        <div class="firewall-panel-body">
          ${renderFirewallWarnings()}
          ${renderRulesetForm()}
          ${renderRulesetList("自定义 WAF 规则", "http_request_firewall_custom", "暂无新版 WAF 规则")}
          ${renderRulesetList("Rate Limiting / 防 CC", "http_ratelimit", "暂无速率限制规则")}
          ${renderFirewallForm()}

          <section class="firewall-rules-section">
            <div class="firewall-rules-heading">
              <h3>现有规则</h3>
              <button
                class="secondary-button firewall-refresh-button"
                type="button"
                id="refresh-firewall-rules"
                ${state.loadingFirewallRules ? "disabled" : ""}
              >
                ${state.loadingFirewallRules ? "刷新中..." : "刷新列表"}
              </button>
            </div>
            ${renderRulesList()}
          </section>
        </div>
      </section>
    </div>
  `;
}
