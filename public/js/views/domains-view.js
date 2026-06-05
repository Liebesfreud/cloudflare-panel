import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml, planLabel, statusLabel } from "../utils.js";
import { renderShell } from "./shell-view.js";

function renderDomainRows() {
  if (state.loadingZones) {
    return `
      <div class="empty-state">
        <div class="spinner"></div>
        <strong>正在读取 Cloudflare 域名</strong>
        <span>通过 Global API Key 拉取当前账号所有 Zone。</span>
      </div>
    `;
  }

  if (state.zoneError) {
    return `
      <div class="empty-state error-state">
        <strong>域名列表加载失败</strong>
        <span>${escapeHtml(state.zoneError)}</span>
      </div>
    `;
  }

  if (state.zones.length === 0) {
    return `
      <div class="empty-state">
        <strong>当前账号暂无域名</strong>
        <span>添加到 Cloudflare 后会显示在这里。</span>
      </div>
    `;
  }

  return `
    <div class="zone-table">
      <div class="zone-header">
        <span>域名</span>
        <span>状态</span>
        <span>区域ID</span>
        <span>计划</span>
        <span></span>
      </div>
      ${state.zones
        .map(
          (zone) => `
            <div class="zone-row zone-row-button" role="button" tabindex="0" data-zone-id="${escapeHtml(zone.id)}">
              <span class="zone-name" title="${escapeHtml(zone.name)}">${escapeHtml(zone.name)}</span>
              <span>
                <span class="status-pill ${zone.status === "active" ? "active" : "pending"}">
                  ${escapeHtml(statusLabel(zone.status))}
                </span>
              </span>
              <span class="zone-id">
                <span>区域ID: ${escapeHtml(zone.id)}</span>
                <button class="icon-button copy-button" type="button" title="复制区域 ID" aria-label="复制区域 ID" data-copy="${escapeHtml(zone.id)}">
                  ${icon("copy")}
                </button>
              </span>
              <span>
                <span class="plan-pill">${escapeHtml(planLabel(zone))}</span>
              </span>
              <span class="icon-button quiet" title="进入 DNS 记录管理" aria-label="进入 DNS 记录管理">
                ${icon("edit")}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

export function renderDomainsView() {
  renderShell(`
    <section class="content">
      <form class="panel add-panel" id="add-domain-form">
        <div class="panel-title">
          <span class="panel-title-icon">${icon("plus")}</span>
          <h2>添加新域名</h2>
        </div>
        <div class="add-row">
          <div class="field">
            <input id="domain-input" name="domain" autocomplete="off" spellcheck="false" placeholder="example.com" />
            <p>输入您想要添加到 Cloudflare 的域名（不包含 www 或其他子域名）</p>
          </div>
          <button class="primary-button" type="submit">
            ${icon("plus")}
            <span>添加域名</span>
          </button>
        </div>
        ${state.notice ? `<div class="notice">${escapeHtml(state.notice)}</div>` : ""}
      </form>

      <section class="panel list-panel">
        <div class="panel-title">
          <span class="panel-title-icon">${icon("globe")}</span>
          <h2>域名列表</h2>
        </div>
        ${renderDomainRows()}
      </section>
    </section>
  `);
}
