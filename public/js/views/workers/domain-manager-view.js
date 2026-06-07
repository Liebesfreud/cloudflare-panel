import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";
import {
  activeDomainZoneId,
  activePreferredZoneId,
  activeRouteZoneId,
  activeWorkerName,
  findZone,
  renderZoneOptions,
} from "./helpers.js";

const defaultPreferredHostname = "saas.sin.fan";

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

function renderPreferredRoutePanel() {
  const zoneId = activePreferredZoneId();
  const zone = findZone(zoneId);
  const pending = state.workersPendingKey === "preferred-route";
  const preferredHostname = state.workersPreferredHostname || defaultPreferredHostname;

  return `
    <section class="workers-domain-section workers-preferred-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>Worker 优选</h3>
          <p>添加路由模式，并在 DNS 中创建不代理的 CNAME。</p>
        </div>
      </div>
      <form class="workers-preferred-form" id="worker-preferred-route-form">
        <label class="workers-field">
          <span>域名区域</span>
          <select id="worker-preferred-zone" name="zoneId" ${state.zones.length === 0 ? "disabled" : ""}>
            ${renderZoneOptions(zoneId)}
          </select>
        </label>
        <label class="workers-field">
          <span>访问域名</span>
          <input name="pattern" value="${escapeHtml(state.workersPreferredPattern || "")}" placeholder="${zone ? `fangwen.${escapeHtml(zone.name)}` : "fangwen.100222.xyz"}" ${!zone ? "disabled" : ""} />
          <small>提交时自动使用 访问域名 + /* 的路由模式</small>
        </label>
        <label class="workers-field">
          <span>优选域名</span>
          <input name="preferredHostname" value="${escapeHtml(preferredHostname)}" placeholder="${defaultPreferredHostname}" ${!zone ? "disabled" : ""} />
          <small>DNS CNAME 指向这里，默认不开启代理</small>
        </label>
        <div class="workers-preferred-action">
          <span aria-hidden="true"></span>
          <button class="workers-primary-button" type="submit" ${!zone || pending ? "disabled" : ""}>
            ${pending ? "添加中..." : "添加优选"}
          </button>
        </div>
      </form>
      <div class="workers-route-preview">
        <span>路由模式</span>
        <code>fangwen.${escapeHtml(zone?.name || "100222.xyz")}/*</code>
        <span>DNS</span>
        <code>CNAME fangwen.${escapeHtml(zone?.name || "100222.xyz")} -&gt; ${escapeHtml(preferredHostname)}</code>
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
          <p>绑定环境变量、KV、D1、R2、Queue 或 Service Binding。</p>
        </div>
      </div>
      <form class="workers-inline-form workers-binding-form" id="worker-binding-form">
        <label class="workers-field">
          <span>类型</span>
          <select name="type">
            <option value="plain_text">环境变量</option>
            <option value="kv_namespace">KV</option>
            <option value="d1">D1</option>
            <option value="r2_bucket">R2</option>
            <option value="queue">Queue</option>
            <option value="service">Service</option>
          </select>
        </label>
        <label class="workers-field">
          <span>绑定名</span>
          <input name="name" placeholder="APP_CONFIG" />
        </label>
        <label class="workers-field">
          <span>值 / 资源 ID</span>
          <input name="value" placeholder="KV ID、D1 ID、bucket 或文本值" />
        </label>
        <button class="workers-primary-button" type="submit" ${state.workersPendingKey === "binding" ? "disabled" : ""}>保存绑定</button>
      </form>
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

function renderSecretsPanel() {
  const secrets = state.workersActiveDetail?.secrets || [];

  return `
    <section class="workers-domain-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>环境变量 Secret</h3>
          <p>Secret 值不会在 Cloudflare API 中回显。</p>
        </div>
      </div>
      <form class="workers-inline-form" id="worker-secret-form">
        <label class="workers-field">
          <span>名称</span>
          <input name="name" placeholder="API_TOKEN" />
        </label>
        <label class="workers-field">
          <span>Secret 值</span>
          <input name="value" type="password" placeholder="不会回显" />
        </label>
        <button class="workers-primary-button" type="submit" ${state.workersPendingKey === "secret" ? "disabled" : ""}>保存 Secret</button>
      </form>
      <div class="workers-resource-list">
        <h4>已保存的 Secret</h4>
        ${
          secrets.length === 0
            ? `<p class="workers-muted">暂无 Secret</p>`
            : secrets
                .map(
                  (secret) => `
                    <div class="workers-resource-row">
                      <span>${escapeHtml(secret.name)}</span>
                      <em>${escapeHtml(secret.type || "secret_text")}</em>
                      <button class="workers-icon-danger worker-secret-delete" type="button" data-secret-name="${escapeHtml(secret.name)}">
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

function renderCronPanel() {
  const schedules = state.workersActiveDetail?.schedules || [];

  return `
    <section class="workers-domain-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>Cron Triggers</h3>
          <p>每行一个 Cron 表达式，保存后整体覆盖当前 Worker 的计划任务。</p>
        </div>
      </div>
      <form class="workers-cron-form" id="worker-cron-form">
        <label class="workers-field">
          <span>Cron 表达式</span>
          <textarea name="schedules" placeholder="*/5 * * * *">${escapeHtml(
            schedules.map((item) => item.cron).join("\n")
          )}</textarea>
        </label>
        <button class="workers-primary-button" type="submit" ${state.workersPendingKey === "cron" ? "disabled" : ""}>保存 Cron</button>
      </form>
    </section>
  `;
}

function renderDeploymentsPanel() {
  const deployments = state.workersActiveDetail?.deployments || [];

  return `
    <section class="workers-domain-section">
      <div class="workers-domain-section-title">
        <div>
          <h3>版本 / 部署记录</h3>
          <p>查看最近的 Worker 部署和版本信息。</p>
        </div>
        <button class="workers-outline-button" type="button" id="worker-tail-open" ${state.workersPendingKey === "tail" ? "disabled" : ""}>
          ${state.workersPendingKey === "tail" ? "创建中..." : "打开日志 Tail"}
        </button>
      </div>
      ${
        state.workersTailInfo
          ? `<div class="workers-tail-box">
              <strong>Tail 会话已创建</strong>
              <code>${escapeHtml(state.workersTailInfo.tail?.url || state.workersTailInfo.tail?.id || "请使用返回会话连接实时日志")}</code>
            </div>`
          : ""
      }
      <div class="workers-resource-list">
        ${
          deployments.length === 0
            ? `<p class="workers-muted">暂无部署记录</p>`
            : deployments
                .slice(0, 6)
                .map(
                  (deployment) => `
                    <div class="workers-resource-row">
                      <span>${escapeHtml(deployment.id || deployment.versionId || "deployment")}</span>
                      <em>${escapeHtml(deployment.createdOn || deployment.source || "-")}</em>
                    </div>
                  `
                )
                .join("")
        }
      </div>
    </section>
  `;
}

export function renderDomainManager() {
  return `
    <div class="workers-domain-grid">
      ${renderSubdomainPanel()}
      ${renderPreferredRoutePanel()}
      ${renderRoutesPanel()}
      ${renderDomainsPanel()}
      ${renderBindingsPanel()}
      ${renderSecretsPanel()}
      ${renderCronPanel()}
      ${renderDeploymentsPanel()}
    </div>
  `;
}
