import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml, sectionTitle } from "../../utils.js";
import { renderZoneSummary } from "../dns-view.js";

const sectionContent = {
  ssl: {
    icon: "shield",
    title: "SSL/TLS 管理",
    subtitle: "选择 Cloudflare 与源服务器之间的加密方式",
    cards: [
      {
        title: "SSL/TLS 加密模式",
        description: "选择 Cloudflare 与源服务器之间的加密方式",
        options: [
          ["关闭（不安全）", "不加密您的网站与 Cloudflare 之间的流量", false],
          ["灵活", "加密浏览器到 Cloudflare 的流量，但不加密 Cloudflare 到源服务器的流量", false],
          ["完全", "加密端到端流量，但不验证源服务器证书", false],
          ["完全（严格）", "加密端到端流量，并验证源服务器证书", true],
        ],
      },
      {
        title: "边缘证书",
        description: "Cloudflare 自动为您的域名提供免费的通用 SSL 证书",
        rows: [
          ["证书状态", "已激活", "success"],
          ["证书类型", "通用 SSL", ""],
        ],
      },
      {
        title: "始终使用 HTTPS",
        description: "自动将所有 HTTP 请求重定向到 HTTPS",
        toggle: false,
      },
      {
        title: "自动 HTTPS 重写",
        description: "自动将不安全的 HTTP 链接重写为安全的 HTTPS 链接",
        toggle: true,
      },
      {
        title: "HTTP 严格传输安全 (HSTS)",
        description: "强制浏览器始终使用 HTTPS 连接，提高安全性",
        toggle: false,
      },
      {
        title: "随机加密",
        description: "允许支持的浏览器在 HTTP 请求上随机使用 HTTPS",
        toggle: true,
      },
      {
        title: "TLS 1.3",
        description: "启用最新的 TLS 1.3 协议，提供更好的性能和安全性",
        toggle: true,
      },
      {
        title: "gRPC",
        description: "允许 gRPC 连接到源站服务器。",
        value: "默认关闭，须到官网打开",
      },
      {
        title: "WebSockets",
        description: "允许 WebSockets 连接到源站服务器。",
        toggle: true,
      },
    ],
  },
  analytics: {
    icon: "grid",
    title: "统计分析",
    subtitle: "查看流量、缓存命中率和安全事件概览",
    cards: [
      { title: "请求数", description: "最近 24 小时请求统计", value: "待接入" },
      { title: "缓存命中率", description: "边缘缓存命中表现", value: "待接入" },
      { title: "威胁拦截", description: "安全事件和挑战统计", value: "待接入" },
    ],
  },
  rules: {
    icon: "settings",
    title: "页面规则",
    subtitle: "配置 URL 匹配后的缓存、重定向和安全动作",
    cards: [
      { title: "页面规则列表", description: "后续接入 Page Rules 或 Rulesets API", value: "待接入" },
      { title: "重定向规则", description: "管理单域名重定向策略", value: "待接入" },
      { title: "缓存规则", description: "按路径覆盖缓存行为", value: "待接入" },
    ],
  },
  certificates: {
    icon: "key",
    title: "证书管理",
    subtitle: "管理边缘证书、源服务器证书和 TLS 相关资产",
    cards: [
      { title: "边缘证书", description: "Cloudflare 提供的通用 SSL 证书", value: "已激活" },
      { title: "源服务器证书", description: "后续接入 Origin CA 证书创建和查看", value: "待接入" },
      { title: "自定义主机名证书", description: "适用于 SaaS 场景的证书状态", value: "待接入" },
    ],
  },
};

function renderToggle(enabled) {
  return `
    <span class="settings-toggle ${enabled ? "on" : ""}" aria-hidden="true">
      <span></span>
    </span>
  `;
}

function renderCard(card) {
  if (card.options) {
    return `
      <section class="settings-card">
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
        <div class="option-list">
          ${card.options
            .map(
              ([title, description, active]) => `
                <div class="option-item ${active ? "active" : ""}">
                  <strong>${escapeHtml(title)}</strong>
                  <span>${escapeHtml(description)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  if (card.rows) {
    return `
      <section class="settings-card">
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
        <div class="settings-rows">
          ${card.rows
            .map(
              ([label, value, tone]) => `
                <div>
                  <span>${escapeHtml(label)}</span>
                  <strong class="${tone === "success" ? "success-text" : ""}">${escapeHtml(value)}</strong>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="settings-card setting-line">
      <div>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
      </div>
      ${card.toggle !== undefined ? renderToggle(card.toggle) : `<strong>${escapeHtml(card.value || "待接入")}</strong>`}
    </section>
  `;
}

export function renderStaticSettingsView(section) {
  const zone = state.selectedZone || { id: "", name: "", status: "", plan: null };
  const content = sectionContent[section] || {
    icon: "settings",
    title: sectionTitle(section),
    subtitle: "此功能正在设计中",
    cards: [{ title: sectionTitle(section), description: "后续逐步接入真实 Cloudflare API", value: "待接入" }],
  };

  return `
    ${renderZoneSummary(zone, {
      description: `管理此域名的 ${content.title}`,
      detail: content.title,
    })}
    <section class="panel settings-panel">
      <div class="settings-heading">
        <div>
          <span class="settings-heading-icon">${icon(content.icon)}</span>
          <h2>${escapeHtml(content.title)}</h2>
          <p>当前域名: ${escapeHtml(zone.name || "Loading")}</p>
        </div>
        <button class="secondary-button" type="button" disabled>刷新</button>
      </div>
      <div class="settings-card-list">
        <div class="settings-intro">
          <h3>${escapeHtml(content.subtitle)}</h3>
        </div>
        ${content.cards.map(renderCard).join("")}
      </div>
    </section>
  `;
}
