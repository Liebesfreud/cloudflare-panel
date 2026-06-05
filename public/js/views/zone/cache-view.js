import { browserCacheTtlOptions, cacheLevelOptions } from "../../constants.js";
import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";
import { renderZoneSummary } from "../dns-view.js";

function readSettingValue(key, fallback) {
  return state.cacheSettings?.[key]?.value ?? fallback;
}

function renderCacheLevelOptions() {
  const activeValue = readSettingValue("cacheLevel", "aggressive");

  return cacheLevelOptions
    .map(
      (option) => `
        <button
          class="option-item cache-level-option ${option.value === activeValue ? "active" : ""}"
          type="button"
          data-cache-level="${escapeHtml(option.value)}"
          ${state.savingCacheSettings ? "disabled" : ""}
        >
          <strong>${escapeHtml(option.label)}</strong>
          <span>${escapeHtml(option.description)}</span>
        </button>
      `
    )
    .join("");
}

function renderTtlOptions() {
  const ttl = String(readSettingValue("browserCacheTtl", 14400));

  return browserCacheTtlOptions
    .map(
      ([value, label]) => `
        <option value="${escapeHtml(value)}" ${value === ttl ? "selected" : ""}>
          ${escapeHtml(label)}
        </option>
      `
    )
    .join("");
}

function renderSwitch({ key, title, description }) {
  const enabled = Boolean(readSettingValue(key, false));

  return `
    <section class="settings-card setting-line">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <label class="switch-control" aria-label="${escapeHtml(title)}">
        <input
          type="checkbox"
          data-cache-toggle="${escapeHtml(key)}"
          ${enabled ? "checked" : ""}
          ${state.savingCacheSettings ? "disabled" : ""}
        />
        <span class="settings-toggle ${enabled ? "on" : ""}" aria-hidden="true">
          <span></span>
        </span>
      </label>
    </section>
  `;
}

function renderCacheContent() {
  if (state.loadingCacheSettings && !state.cacheSettings) {
    return `
      <div class="empty-state">
        <div class="spinner"></div>
        <strong>正在读取缓存设置</strong>
        <span>从 Cloudflare 读取当前 Zone 的缓存级别、浏览器 TTL 和开关状态。</span>
      </div>
    `;
  }

  if (state.cacheError) {
    return `
      <div class="empty-state error-state">
        <strong>缓存设置加载失败</strong>
        <span>${escapeHtml(state.cacheError)}</span>
      </div>
    `;
  }

  return `
    <section class="settings-card">
      <h3>缓存级别</h3>
      <div class="option-list cache-level-list">${renderCacheLevelOptions()}</div>
    </section>

    <section class="settings-card setting-line">
      <div>
        <h3>浏览器缓存过期时间</h3>
      </div>
      <label class="compact-select">
        <span class="visually-hidden">浏览器缓存过期时间</span>
        <select id="browser-cache-ttl" ${state.savingCacheSettings ? "disabled" : ""}>
          ${renderTtlOptions()}
        </select>
      </label>
    </section>

    <section class="settings-card purge-card">
      <h3>清除缓存</h3>
      <div class="purge-all-row">
        <div>
          <p>清除当前域名的全部边缘缓存。</p>
        </div>
        <button class="danger-button cache-danger-button" type="button" id="purge-all-cache" ${state.purgingCache ? "disabled" : ""}>
          清除所有缓存
        </button>
      </div>
      <form class="purge-url-form" id="purge-url-form">
        <label class="compact-select">
          <span class="visually-hidden">清除方式</span>
          <select disabled>
            <option>按 URL 清除</option>
          </select>
        </label>
        <input id="cache-purge-url" autocomplete="off" spellcheck="false" placeholder="例如: https://example.com/path" />
        <button class="primary-button" type="submit" ${state.purgingCache ? "disabled" : ""}>清除</button>
      </form>
    </section>

    ${renderSwitch({
      key: "developmentMode",
      title: "开发模式",
      description: "临时绕过缓存，方便调试源站内容。",
    })}

    ${renderSwitch({
      key: "alwaysOnline",
      title: "宕机在线",
      description: "源站不可用时尽量展示 Cloudflare 已缓存的页面。",
    })}
  `;
}

export function renderCacheSettingsView() {
  const zone = state.selectedZone || { id: "", name: "", status: "", plan: null };

  return `
    ${renderZoneSummary(zone, {
      description: "管理此域名的缓存策略与清理操作",
      detail: "缓存管理",
    })}
    ${state.notice ? `<div class="notice page-notice">${escapeHtml(state.notice)}</div>` : ""}
    <section class="panel settings-panel">
      <div class="settings-heading">
        <div>
          <span class="settings-heading-icon">${icon("archive")}</span>
          <h2>缓存管理</h2>
          <p>当前域名: ${escapeHtml(zone.name || "Loading")}</p>
        </div>
        <button class="secondary-button" type="button" id="refresh-zone-settings" ${state.loadingCacheSettings ? "disabled" : ""}>
          刷新
        </button>
      </div>
      ${
        state.cacheWarnings.length
          ? `<div class="notice settings-warning">${escapeHtml(state.cacheWarnings.join("；"))}</div>`
          : ""
      }
      <div class="settings-card-list">${renderCacheContent()}</div>
    </section>
  `;
}
