import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";
import { renderShell } from "./shell-view.js";

const securityPresetItems = [
  "安全级别：高",
  "SSL模式：严格",
  "强制HTTPS：开启",
  "HTTPS自动重写：开启",
  "TLS 1.3：启用",
  "最低TLS版本：1.2",
  "机会性加密：开启",
  "缓存级别：基础",
  "浏览器缓存：4小时",
  "访客验证：30分钟",
  "浏览器检查：开启",
  "防盗链保护：开启",
];

const speedPresetItems = [
  "安全级别：低",
  "SSL模式：严格",
  "缓存级别：积极",
  "浏览器缓存：1年",
  "图片优化：无损",
  "HTML压缩：启用",
  "CSS压缩：启用",
  "JS压缩：启用",
  "Brotli压缩：启用",
  "Early Hints：启用",
  "HTTP/3：启用",
];

const selectOptions = {
  securityLevel: [
    ["off", "关闭"],
    ["essentially_off", "基本关闭"],
    ["low", "低"],
    ["medium", "中"],
    ["high", "高"],
    ["under_attack", "受攻击"],
  ],
  challengeTtl: [
    ["300", "5分钟"],
    ["900", "15分钟"],
    ["1800", "半小时"],
    ["3600", "1小时"],
    ["7200", "2小时"],
  ],
  cacheLevel: [
    ["basic", "基础"],
    ["simplified", "简化"],
    ["aggressive", "积极"],
  ],
  browserCacheTtl: [
    ["1800", "30分钟"],
    ["3600", "1小时"],
    ["7200", "2小时"],
    ["14400", "4小时"],
    ["86400", "1天"],
    ["31536000", "1年"],
  ],
  rocketLoader: [
    ["off", "关闭"],
    ["on", "启用"],
  ],
};

function activeZoneId() {
  return state.automationZoneId || state.zones[0]?.id || "";
}

function automation() {
  return state.automationState || {};
}

function zoneName() {
  return automation().zone?.name || state.zones.find((zone) => zone.id === activeZoneId())?.name || "";
}

function settingValue(key, fallback = "") {
  return automation().settings?.[key]?.value ?? fallback;
}

function isPending(key) {
  return state.automationPendingKey === key || state.automationApplying || state.automationLoading;
}

function renderZoneOptions() {
  return state.zones
    .map(
      (zone) => `
        <option value="${escapeHtml(zone.id)}" ${zone.id === activeZoneId() ? "selected" : ""}>
          ${escapeHtml(zone.name)}
        </option>
      `
    )
    .join("");
}

function renderWarnings() {
  const warnings = automation().warnings || [];

  if (!state.automationNotice && warnings.length === 0) {
    return "";
  }

  return `
    <div class="automation-notice">
      ${state.automationNotice ? `<p>${escapeHtml(state.automationNotice)}</p>` : ""}
      ${warnings.slice(0, 4).map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
    </div>
  `;
}

function renderSwitch({
  id,
  checked = false,
  disabled = false,
  dataset = "",
  label = "",
}) {
  return `
    <label class="automation-switch" ${label ? `aria-label="${escapeHtml(label)}"` : ""}>
      <input
        id="${escapeHtml(id)}"
        type="checkbox"
        ${checked ? "checked" : ""}
        ${disabled ? "disabled" : ""}
        ${dataset}
      />
      <span aria-hidden="true"></span>
    </label>
  `;
}

function renderSelect({ id, key, value, options, disabled = false }) {
  return `
    <select
      id="${escapeHtml(id)}"
      class="automation-select"
      data-automation-setting="${escapeHtml(key)}"
      ${disabled ? "disabled" : ""}
    >
      ${options
        .map(
          ([optionValue, label]) => `
            <option value="${escapeHtml(optionValue)}" ${String(value) === optionValue ? "selected" : ""}>
              ${escapeHtml(label)}
            </option>
          `
        )
        .join("")}
    </select>
  `;
}

function renderToggleTile({ title, text, checked, disabled, id, dataset, danger = false }) {
  return `
    <div class="automation-tile ${danger ? "automation-danger-tile" : ""}">
      <div>
        <h4>${escapeHtml(title)}</h4>
        <p>${text}</p>
      </div>
      ${renderSwitch({ id, checked, disabled, dataset, label: title })}
    </div>
  `;
}

function renderSelectBlock({ title, hint, key, value, options, recommendation }) {
  return `
    <div class="automation-select-block">
      <label for="automation-${escapeHtml(key)}">
        ${escapeHtml(title)}
        ${recommendation ? `<span>${escapeHtml(recommendation)}</span>` : ""}
      </label>
      ${renderSelect({
        id: `automation-${key}`,
        key,
        value,
        options,
        disabled: isPending(key),
      })}
      <p>${escapeHtml(hint)}</p>
    </div>
  `;
}

function renderPresetList(items, title) {
  return `
    <div class="automation-preset-list">
      <h4>${escapeHtml(title)}</h4>
      <ul>
        ${items.map((item) => `<li>• ${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderInfoPanel() {
  const savingText = state.automationPendingKey ? "正在保存 1 项变更..." : "";

  return `
    <section class="automation-panel automation-info-panel">
      <p><strong>即时生效模式已开启，下面的开关和选项会自动同步到 Cloudflare，界面状态就是当前生效状态。</strong></p>
      <p>选择上方预设并点击“开始优化”仍会批量覆盖相关配置；单项调节则是实时保存。</p>
      ${state.automationLoading ? "<p>正在同步当前配置...</p>" : ""}
      ${savingText ? `<p>${escapeHtml(savingText)}</p>` : ""}
    </section>
  `;
}

function renderPresetPanel() {
  return `
    <section class="automation-panel">
      <div class="automation-heading">
        <h2>
          自动优化设置
          <span>Auto</span>
          ${zoneName() ? `<em>- ${escapeHtml(zoneName())}</em>` : ""}
        </h2>
        <div class="automation-zone-picker">
          <select id="automation-zone" ${state.automationLoading || state.automationApplying ? "disabled" : ""}>
            ${renderZoneOptions()}
          </select>
          <button class="automation-icon-button" id="automation-refresh" type="button" title="刷新" aria-label="刷新" ${state.automationLoading ? "disabled" : ""}>
            ${icon("refresh")}
          </button>
        </div>
      </div>

      <div class="automation-body">
        <div class="automation-copy">
          <p><strong>最优安全</strong>侧重防御，对部分用户体验稍有影响； <strong>最优速度</strong>侧重速度，偏重于不干扰访问，可能容易被攻击。</p>
          <p class="automation-danger-text">注意：点击“开始优化”会按预设批量覆盖下面对应项目，请在确认方向后再执行。</p>
        </div>

        <div class="automation-preset-controls">
          <select id="automation-preset" ${state.automationApplying ? "disabled" : ""}>
            <option value="">优化方向选择</option>
            <option value="security" ${state.automationPreset === "security" ? "selected" : ""}>最优安全</option>
            <option value="speed" ${state.automationPreset === "speed" ? "selected" : ""}>最优速度</option>
          </select>
          <button
            class="automation-danger-button"
            id="automation-apply-preset"
            type="button"
            ${!state.automationPreset || state.automationApplying || state.automationLoading ? "disabled" : ""}
          >
            ${state.automationApplying ? "优化中..." : "开始优化"}
          </button>
        </div>

        ${state.automationPreset === "security" ? renderPresetList(securityPresetItems, "安全优化将配置：") : ""}
        ${state.automationPreset === "speed" ? renderPresetList(speedPresetItems, "速度优化将配置：") : ""}
      </div>
    </section>
  `;
}

function renderSecurityPanel() {
  const firewall = automation().firewall || {};
  const dnsProxy = automation().dnsProxy || {};
  const proxiableCount = Number(dnsProxy.proxiableCount) || 0;
  const proxiedCount = Number(dnsProxy.proxiedCount) || 0;
  const securityLevel = settingValue("securityLevel", "medium");

  return `
    <section class="automation-panel">
      <div class="automation-heading">
        <h2>操作选项与安全设置</h2>
      </div>
      <div class="automation-body">
        <div class="automation-grid">
          ${renderToggleTile({
            title: "操作代理IP",
            text: `批量切换可代理 DNS 记录的小黄云，当前 ${proxiedCount}/${proxiableCount} 已代理`,
            checked: Boolean(dnsProxy.enabled),
            disabled: isPending("proxy_dns_records") || proxiableCount === 0,
            id: "automation-dns-proxy",
          })}
          ${renderToggleTile({
            title: "拦截带?参数",
            text: "即时创建或停用对应防火墙规则",
            checked: Boolean(firewall.blockQueryParams?.enabled),
            disabled: isPending("blockQueryParams"),
            id: "automation-block-query-params",
            dataset: 'data-automation-firewall="blockQueryParams"',
          })}
          ${renderToggleTile({
            title: "拦截非中国流量",
            text: "即时创建或停用仅允许中国访问的规则",
            checked: Boolean(firewall.blockNonChinaTraffic?.enabled),
            disabled: isPending("blockNonChinaTraffic"),
            id: "automation-block-non-china",
            dataset: 'data-automation-firewall="blockNonChinaTraffic"',
          })}
          ${renderToggleTile({
            title: "拦截非GET流量",
            text: "即时创建或停用只允许 GET 的规则",
            checked: Boolean(firewall.blockNonGetTraffic?.enabled),
            disabled: isPending("blockNonGetTraffic"),
            id: "automation-block-non-get",
            dataset: 'data-automation-firewall="blockNonGetTraffic"',
          })}
        </div>

        ${renderToggleTile({
          title: "启用5秒盾 (Under Attack Mode)",
          text: "即时切换安全级别为 under_attack，再次关闭会恢复到上一个安全级别",
          checked: securityLevel === "under_attack",
          disabled: isPending("securityLevel"),
          id: "automation-under-attack",
          danger: true,
        })}

        <div class="automation-grid automation-separated-grid">
          ${renderSelectBlock({
            title: "安全级别",
            recommendation: "(建议:高)",
            key: "securityLevel",
            value: securityLevel,
            options: selectOptions.securityLevel,
            hint: "威胁检测级别，越高越安全",
          })}
          ${renderSelectBlock({
            title: "访客重验时长",
            recommendation: "(建议:30分钟)",
            key: "challengeTtl",
            value: String(settingValue("challengeTtl", 1800)),
            options: selectOptions.challengeTtl,
            hint: "验证有效期，平衡安全与体验",
          })}
          ${renderToggleTile({
            title: "浏览器检查",
            text: "验证真实浏览器，建议开启",
            checked: Boolean(settingValue("browserCheck", true)),
            disabled: isPending("browserCheck"),
            id: "automation-browser-check",
            dataset: 'data-automation-setting="browserCheck"',
          })}
          ${renderToggleTile({
            title: "防盗链",
            text: "防止资源盗用，推荐开启",
            checked: Boolean(settingValue("hotlinkProtection", false)),
            disabled: isPending("hotlinkProtection"),
            id: "automation-hotlink-protection",
            dataset: 'data-automation-setting="hotlinkProtection"',
          })}
          ${renderToggleTile({
            title: "Email加密",
            text: "隐藏邮箱地址，可选",
            checked: Boolean(settingValue("emailObfuscation", true)),
            disabled: isPending("emailObfuscation"),
            id: "automation-email-obfuscation",
            dataset: 'data-automation-setting="emailObfuscation"',
          })}
          ${renderToggleTile({
            title: "IPV6",
            text: "支持IPv6网络，建议开启",
            checked: Boolean(settingValue("ipv6", true)),
            disabled: isPending("ipv6"),
            id: "automation-ipv6",
            dataset: 'data-automation-setting="ipv6"',
          })}
          ${renderToggleTile({
            title: "分层缓存",
            text: automation().tieredCaching?.supported
              ? "使用 Cloudflare Tiered Cache API 即时开关"
              : "当前套餐或接口暂不可用",
            checked: Boolean(automation().tieredCaching?.enabled),
            disabled: isPending("tiered_caching") || !automation().tieredCaching?.supported,
            id: "automation-tiered-caching",
          })}
        </div>
      </div>
    </section>
  `;
}

function renderCachePanel() {
  const minify = settingValue("minify", { html: true, css: true, js: true });
  const pageRules = automation().pageRules || {};
  const allPattern = pageRules.cacheAllPages?.pattern || `${zoneName() || "当前域名"}/*`;
  const htmlPattern = pageRules.cacheHtml?.pattern || `${zoneName() || "当前域名"}/*.html*`;

  return `
    <section class="automation-panel">
      <div class="automation-heading automation-heading-with-note">
        <h2>缓存设置</h2>
        <p>支持即时更新，页面规则开关会自动创建或停用对应缓存规则</p>
      </div>
      <div class="automation-body">
        <div class="automation-minify">
          <label>代码压缩 <span>(全部建议开启)</span></label>
          <div>
            ${["html", "css", "js"]
              .map(
                (part) => `
                  <button
                    class="automation-chip ${minify[part] ? "active" : ""}"
                    type="button"
                    data-automation-minify="${escapeHtml(part)}"
                    ${isPending("minify") ? "disabled" : ""}
                  >
                    ${escapeHtml(part)}
                  </button>
                `
              )
              .join("")}
          </div>
          <p>自动压缩代码，提升加载速度</p>
        </div>

        <div class="automation-grid">
          ${renderSelectBlock({
            title: "静态文件缓存",
            recommendation: "(建议:积极)",
            key: "cacheLevel",
            value: settingValue("cacheLevel", "aggressive"),
            options: selectOptions.cacheLevel,
            hint: "缓存策略，积极可提升速度",
          })}
          ${renderSelectBlock({
            title: "浏览器缓存时间",
            recommendation: "(建议:4小时)",
            key: "browserCacheTtl",
            value: String(settingValue("browserCacheTtl", 7200)),
            options: selectOptions.browserCacheTtl,
            hint: "浏览器本地缓存时长",
          })}
        </div>

        <div class="automation-subsection">
          <label>页面规则</label>
          <div class="automation-grid automation-compact-grid">
            ${renderToggleTile({
              title: "全站缓存",
              text: `即时创建或停用 \`${allPattern}\` 的全部缓存规则`,
              checked: Boolean(pageRules.cacheAllPages?.enabled),
              disabled: isPending("cacheAllPages") || !zoneName(),
              id: "automation-cache-all-pages",
              dataset: 'data-automation-page-rule="cacheAllPages"',
            })}
            ${renderToggleTile({
              title: "缓存HTML",
              text: `即时创建或停用 \`${htmlPattern}\` 的缓存规则`,
              checked: Boolean(pageRules.cacheHtml?.enabled),
              disabled: isPending("cacheHtml") || !zoneName(),
              id: "automation-cache-html",
              dataset: 'data-automation-page-rule="cacheHtml"',
            })}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPerformancePanel() {
  return `
    <section class="automation-panel">
      <div class="automation-heading">
        <h2>性能加速</h2>
      </div>
      <div class="automation-body">
        <div class="automation-grid">
          ${renderToggleTile({
            title: "Brotli 压缩",
            text: "比Gzip更高效，建议开启",
            checked: Boolean(settingValue("brotli", false)),
            disabled: isPending("brotli"),
            id: "automation-brotli",
            dataset: 'data-automation-setting="brotli"',
          })}
          ${renderToggleTile({
            title: "HTTP/3",
            text: "最新协议，提升速度，推荐",
            checked: Boolean(settingValue("http3", false)),
            disabled: isPending("http3"),
            id: "automation-http3",
            dataset: 'data-automation-setting="http3"',
          })}
          ${renderToggleTile({
            title: "0-RTT",
            text: "快速重连，可选开启",
            checked: Boolean(settingValue("zeroRtt", false)),
            disabled: isPending("zeroRtt"),
            id: "automation-zero-rtt",
            dataset: 'data-automation-setting="zeroRtt"',
          })}
          ${renderSelectBlock({
            title: "Rocket Loader",
            recommendation: "(不建议)",
            key: "rocketLoader",
            value: settingValue("rocketLoader", "off"),
            options: selectOptions.rocketLoader,
            hint: "异步加载JS，可能导致问题",
          })}
        </div>
      </div>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="content automation-content">
      <section class="automation-panel automation-empty-panel">
        <h2>自动优化设置</h2>
        <p>${state.loadingZones ? "正在读取域名列表..." : "当前账号暂无可优化的域名"}</p>
      </section>
    </section>
  `;
}

export function renderAutomationView() {
  if (!state.zones.length) {
    renderShell(renderEmptyState());
    return;
  }

  renderShell(`
    <section class="content automation-content">
      <div class="automation-scroll-shell">
        ${renderWarnings()}
        ${renderInfoPanel()}
        ${renderPresetPanel()}
        ${renderSecurityPanel()}
        ${renderCachePanel()}
        ${renderPerformancePanel()}
      </div>
    </section>
  `);
}
