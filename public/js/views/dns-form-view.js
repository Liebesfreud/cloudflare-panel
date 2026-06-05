import { dnsTypes, proxiableTypes, ttlOptions } from "../constants.js";
import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml, getTypeHint } from "../utils.js";

function renderTtlOptions(currentTtl) {
  return ttlOptions
    .map(
      ([value, label]) =>
        `<option value="${value}" ${String(currentTtl) === value ? "selected" : ""}>${label}</option>`
    )
    .join("");
}

function renderTypeOptions(currentType) {
  return dnsTypes
    .map(
      (type) => `<option value="${type}" ${currentType === type ? "selected" : ""}>${type}</option>`
    )
    .join("");
}

export function renderDnsForm() {
  const form = state.dnsForm;
  const hint = getTypeHint(form.type);
  const isEdit = Boolean(form.id);
  const proxiable = proxiableTypes.has(form.type);

  return `
    <form class="panel dns-form-panel" id="dns-record-form">
      <div class="dns-form-heading">
        <div>
          <span class="section-kicker">${isEdit ? "Edit Record" : "Create Record"}</span>
          <h2>${isEdit ? "编辑 DNS 记录" : "添加 DNS 记录"}</h2>
        </div>
        ${isEdit ? `<button class="ghost-button" type="button" id="cancel-dns-edit">取消编辑</button>` : ""}
      </div>

      <div class="dns-form-grid">
        <label class="field-label">
          <span>记录类型</span>
          <select name="type">
            ${renderTypeOptions(form.type)}
          </select>
        </label>
        <label class="field-label">
          <span>名称</span>
          <input name="name" value="${escapeHtml(form.name)}" placeholder="${escapeHtml(hint.name)}" required />
        </label>
        <label class="field-label content-field">
          <span>内容</span>
          <input name="content" value="${escapeHtml(form.content)}" placeholder="${escapeHtml(hint.content)}" required />
          <small>${escapeHtml(hint.help)}</small>
        </label>
        <label class="field-label option-field">
          <span>TTL</span>
          <select name="ttl">${renderTtlOptions(form.ttl)}</select>
        </label>
        <label class="field-label option-field ${form.type === "MX" ? "" : "muted-field"}">
          <span>优先级</span>
          <input name="priority" value="${escapeHtml(form.priority)}" inputmode="numeric" placeholder="10" ${form.type === "MX" ? "" : "disabled"} />
        </label>
        <label class="proxy-toggle ${proxiable ? "" : "disabled"}">
          <input name="proxied" type="checkbox" ${form.proxied ? "checked" : ""} ${proxiable ? "" : "disabled"} />
          <span class="toggle-track" aria-hidden="true"></span>
          <span>
            <strong>Cloudflare 代理</strong>
            <em>${proxiable ? "开启后流量经过 Cloudflare" : "当前类型不支持代理"}</em>
          </span>
        </label>
        <label class="field-label comment-field">
          <span>备注</span>
          <input name="comment" value="${escapeHtml(form.comment)}" placeholder="可选" />
        </label>
      </div>

      <div class="form-actions">
        <button class="primary-button gradient-button" type="submit" ${state.savingDns ? "disabled" : ""}>
          ${icon(isEdit ? "save" : "plus")}
          <span>${state.savingDns ? "保存中" : isEdit ? "保存记录" : "创建记录"}</span>
        </button>
        <button class="secondary-button reset-button" type="button" id="reset-dns-form">
          <span>${isEdit ? "放弃修改" : "清空"}</span>
        </button>
      </div>
    </form>
  `;
}
