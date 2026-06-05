import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml, planLabel, statusLabel } from "../utils.js";
import { renderDnsForm } from "./dns-form-view.js";
import { renderDnsRecords } from "./dns-records-view.js";

export function renderZoneSummary(zone, { description = "管理此域名的 DNS 记录", detail = "" } = {}) {
  return `
    <section class="panel zone-summary-panel">
      <button class="back-button" type="button" id="back-to-domains" title="返回域名列表" aria-label="返回域名列表">${icon("arrowLeft")}</button>
      <div class="zone-summary-body">
        <div class="zone-summary-title">
          <h2>${escapeHtml(zone.name)}</h2>
          <span class="status-pill ${zone.status === "active" ? "active" : "pending"}">
            ${escapeHtml(statusLabel(zone.status))}
          </span>
          <span class="plan-pill">${escapeHtml(planLabel(zone))}</span>
        </div>
        <div class="zone-meta-row">
          <span class="zone-id-large">区域ID: ${escapeHtml(zone.id)}
            <button class="icon-button copy-button" type="button" title="复制区域 ID" aria-label="复制区域 ID" data-copy="${escapeHtml(zone.id)}">${icon("copy")}</button>
          </span>
          ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
        </div>
        <p>${escapeHtml(description)}</p>
      </div>
    </section>
  `;
}

export function renderDnsView() {
  const zone = state.selectedZone || { id: "", name: "", status: "", plan: null };

  return `
    ${renderZoneSummary(zone, { detail: `${state.dnsRecords.length} 条 DNS 记录` })}
    ${state.notice ? `<div class="notice page-notice">${escapeHtml(state.notice)}</div>` : ""}

    <div class="dns-toolbar">
      <button class="primary-button dns-toolbar-button" type="button" id="open-dns-form">
        ${icon("plus")}
        <span>添加 DNS 记录</span>
      </button>
      <button class="secondary-button dns-toolbar-button" type="button" disabled>
        ${icon("upload")}
        <span>批量添加 DNS 记录</span>
      </button>
    </div>

    ${state.dnsFormOpen ? renderDnsForm() : ""}

    <section class="panel dns-records-panel">
      <div class="dns-record-title">
        <h2>DNS 记录</h2>
        <div class="selected-counter">
          <span>已选 0 / ${state.dnsRecords.length}</span>
          <button class="danger-button" type="button" disabled>批量删除</button>
        </div>
      </div>
      ${renderDnsRecords()}
    </section>
  `;
}
