import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";

const sslModes = [
  ["off", "关闭", "不启用边缘 HTTPS"],
  ["flexible", "灵活", "浏览器到 Cloudflare 加密，回源可为 HTTP"],
  ["full", "完全", "端到端加密，不校验证书链"],
  ["strict", "完全（严格）", "端到端加密并校验源站证书"],
];

const tlsVersions = [
  ["1.0", "TLS 1.0"],
  ["1.1", "TLS 1.1"],
  ["1.2", "TLS 1.2"],
  ["1.3", "TLS 1.3"],
];

function settingValue(key, fallback = "") {
  return state.sslSettings?.[key]?.value ?? fallback;
}

function renderWarnings() {
  if (!state.sslWarnings.length) {
    return "";
  }

  return `
    <div class="settings-warning-list">
      ${state.sslWarnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
    </div>
  `;
}

function renderModeOptions() {
  const currentMode = settingValue("ssl", "flexible");

  return `
    <div class="ssl-mode-grid">
      ${sslModes
        .map(
          ([value, label, desc]) => `
            <button
              class="ssl-mode-card ${currentMode === value ? "active" : ""}"
              type="button"
              data-ssl-setting="ssl"
              value="${escapeHtml(value)}"
              ${state.savingSslSettings ? "disabled" : ""}
            >
              <strong>${escapeHtml(label)}</strong>
              <span>${escapeHtml(desc)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderToggle(key, label, desc) {
  const enabled = Boolean(settingValue(key, false));

  return `
    <label class="ssl-setting-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(desc)}</span>
      </div>
      <input
        class="ssl-native-toggle"
        type="checkbox"
        data-ssl-setting="${escapeHtml(key)}"
        ${enabled ? "checked" : ""}
        ${state.savingSslSettings ? "disabled" : ""}
      />
    </label>
  `;
}

function renderContent(zone) {
  if (state.loadingSslSettings && !state.sslSettings) {
    return `
      <div class="settings-empty">
        <span class="spinner"></span>
        <strong>正在读取 SSL/TLS 设置...</strong>
      </div>
    `;
  }

  if (state.sslError) {
    return `
      <div class="settings-empty error-state">
        <strong>SSL/TLS 设置加载失败</strong>
        <span>${escapeHtml(state.sslError)}</span>
      </div>
    `;
  }

  return `
    ${renderWarnings()}
    <section class="settings-card">
      <h3>SSL/TLS 加密模式</h3>
      <p>当前域名: ${escapeHtml(zone.name || "Loading")}</p>
      ${renderModeOptions()}
    </section>

    <section class="settings-card">
      <div class="ssl-inline-head">
        <div>
          <h3>最低 TLS 版本</h3>
          <p>控制访客连接 Cloudflare 边缘时允许的最低 TLS 协议。</p>
        </div>
        <select data-ssl-setting="minTlsVersion" ${state.savingSslSettings ? "disabled" : ""}>
          ${tlsVersions
            .map(
              ([value, label]) => `
                <option value="${escapeHtml(value)}" ${settingValue("minTlsVersion", "1.2") === value ? "selected" : ""}>
                  ${escapeHtml(label)}
                </option>
              `
            )
            .join("")}
        </select>
      </div>
    </section>

    <section class="settings-card ssl-toggle-list">
      ${renderToggle("alwaysUseHttps", "始终使用 HTTPS", "自动将 HTTP 请求 301 重定向到 HTTPS。")}
      ${renderToggle("automaticHttpsRewrites", "自动 HTTPS 重写", "将 HTML 中不安全的 HTTP 链接改写为 HTTPS。")}
      ${renderToggle("tls13", "TLS 1.3", "启用更新的 TLS 协议，改善握手性能。")}
      ${renderToggle("opportunisticEncryption", "机会性加密", "为支持的旧式请求提供额外加密机会。")}
      ${renderToggle("websockets", "WebSockets", "允许 WebSocket 连接通过 Cloudflare。")}
      ${renderToggle("http3", "HTTP/3", "启用 QUIC/HTTP3 边缘访问能力。")}
    </section>
  `;
}

export function renderSslSettingsView() {
  const zone = state.selectedZone || { name: "Loading" };

  return `
    <div class="settings-page">
      <div class="settings-top-row">
        <button class="settings-back-button" type="button" id="back-to-domains">← 返回域名列表</button>
        <button class="secondary-button" type="button" id="refresh-zone-settings" ${state.loadingSslSettings ? "disabled" : ""}>
          ${state.loadingSslSettings ? "刷新中..." : "刷新"}
        </button>
      </div>

      ${state.notice ? `<div class="notice page-notice">${escapeHtml(state.notice)}</div>` : ""}

      <section class="panel settings-panel">
        <div class="settings-heading">
          <div>
            <span class="settings-heading-icon">${icon("shield")}</span>
            <h2>SSL/TLS</h2>
            <p>管理边缘加密、回源模式和 TLS 协议。</p>
          </div>
        </div>
        <div class="settings-card-list">
          ${renderContent(zone)}
        </div>
      </section>
    </div>
  `;
}
