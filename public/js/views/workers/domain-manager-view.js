import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";
import {
  activeDomainZoneId,
  activeRouteZoneId,
  activeWorkerName,
  findZone,
  renderZoneOptions,
} from "./helpers.js";

function renderSubdomainPanel() {
  const workerName = activeWorkerName();
  const subdomain = state.workersActiveDetail?.subdomain;
  const enabled = Boolean(subdomain?.enabled);
  const pending = state.workersPendingKey === "subdomain";

  return `
    <section class="workers-domain-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>Workers.dev 子域</h3>
          <p>${escapeHtml(workerName)}.workers.dev</p>
        </div>
        <label class="workers-switch" aria-label="Workers.dev 子域">
          <input id="worker-subdomain-toggle" type="checkbox" ${enabled ? "checked" : ""} ${pending ? "disabled" : ""} />
          <span aria-hidden="true"></span>
        </label>
      </div>
      <div class="workers-status-line">
        <span class="${enabled ? "is-enabled" : ""}">${enabled ? "已启用" : "已禁用"}</span>
        <p>启用后 Worker 可通过 workers.dev 子域访问；预览 URL 会跟随该开关同步。</p>
      </div>
    </section>
  `;
}

function renderRoutesPanel() {
  const zoneId = activeRouteZoneId();
  const zone = findZone(zoneId);

  return `
    <section class="workers-domain-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>路由</h3>
          <p>为 Worker 添加 Cloudflare 路由</p>
        </div>
      </div>
      <form class="workers-inline-form" id="worker-route-form">
        <label class="workers-field">
          <span>域名区域</span>
          <select id="worker-route-zone" name="zoneId" ${state.zones.length === 0 ? "disabled" : ""}>
            ${renderZoneOptions(zoneId)}
          </select>
        </label>
        <label class="workers-field">
          <span>路由模式</span>
          <input name="pattern" placeholder="api、example.com/* 或 api.example.com/*" ${!zone ? "disabled" : ""} />
        </label>
        <button class="workers-primary-button" type="submit" ${!zone || state.workersPendingKey === "route" ? "disabled" : ""}>
          添加路由
        </button>
      </form>
      <div class="workers-resource-list">
        <h4>已添加的路由</h4>
        ${
          state.workersRoutesLoading
            ? `<p class="workers-muted">正在加载路由...</p>`
            : state.workersRoutes.length === 0
              ? `<p class="workers-muted">暂无路由</p>`
              : state.workersRoutes
                  .map(
                    (route) => `
                      <div class="workers-resource-row">
                        <span>${escapeHtml(route.pattern)}</span>
                        <button class="workers-icon-danger worker-route-delete" type="button" data-route-id="${escapeHtml(route.id)}">
                          ${icon("trash")}
                        </button>
                      </div>
                    `
                  )
                  .join("")
        }
      </div>
    </section>
  `;
}

function renderDomainsPanel() {
  const zoneId = activeDomainZoneId();
  const domains = state.workersActiveDetail?.domains || [];
  const zone = findZone(zoneId);

  return `
    <section class="workers-domain-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>自定义域</h3>
          <p>为 Worker 添加 Cloudflare 自定义域</p>
        </div>
      </div>
      <form class="workers-inline-form" id="worker-domain-form">
        <label class="workers-field">
          <span>域名区域</span>
          <select id="worker-domain-zone" name="zoneId" ${state.zones.length === 0 ? "disabled" : ""}>
            ${renderZoneOptions(zoneId)}
          </select>
        </label>
        <label class="workers-field">
          <span>自定义域</span>
          <input name="hostname" placeholder="api、example.com 或 api.example.com" ${!zone ? "disabled" : ""} />
        </label>
        <button class="workers-primary-button" type="submit" ${!zone || state.workersPendingKey === "domain" ? "disabled" : ""}>
          添加自定义域
        </button>
      </form>
      <div class="workers-resource-list">
        <h4>已添加的自定义域</h4>
        ${
          domains.length === 0
            ? `<p class="workers-muted">暂无自定义域</p>`
            : domains
                .map(
                  (domain) => `
                    <div class="workers-resource-row">
                      <span>${escapeHtml(domain.hostname)}</span>
                      <em>${escapeHtml(domain.zoneName || domain.environment || "production")}</em>
                      <button class="workers-icon-danger worker-domain-delete" type="button" data-domain-id="${escapeHtml(domain.id)}">
                        ${icon("trash")}
                      </button>
                    </div>
                  `
                )
                .join("")
        }
      </div>
    </section>
  `;
}

function renderBindingsPanel() {
  const bindings = state.workersActiveDetail?.settings?.bindings || [];

  return `
    <section class="workers-domain-section workers-bindings-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>资源绑定</h3>
          <p>D1 数据库、KV 命名空间等资源会在后续功能接入。</p>
        </div>
      </div>
      ${
        bindings.length === 0
          ? `<p class="workers-muted">暂无绑定</p>`
          : bindings
              .map(
                (binding) => `
                  <div class="workers-resource-row">
                    <span>${escapeHtml(binding.name || binding.type || "binding")}</span>
                    <em>${escapeHtml(binding.type || "")}</em>
                  </div>
                `
              )
              .join("")
      }
    </section>
  `;
}

export function renderDomainManager() {
  return `
    <div class="workers-domain-grid">
      ${renderSubdomainPanel()}
      ${renderRoutesPanel()}
      ${renderDomainsPanel()}
      ${renderBindingsPanel()}
    </div>
  `;
}
