import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

function renderSavedAccount() {
  if (!state.sessionHasServerCredentials) {
    return "";
  }

  return `
    <div class="saved-account">
      <div>
        <strong>${escapeHtml(state.sessionEmail || "已配置服务端凭据")}</strong>
        <span>已从本地服务端检测到 Cloudflare 凭据</span>
      </div>
      <button class="ghost-button" type="button" id="connect-with-server-credentials">
        快速进入
      </button>
    </div>
  `;
}

function renderConnectBody() {
  if (state.checkingSession) {
    return `
      <div class="connect-loading">
        <div class="spinner"></div>
        <strong>正在检查 Cloudflare 凭据</strong>
      </div>
    `;
  }

  return `
    <div class="connect-heading">
      <h2>连接您的 Cloudflare 账号</h2>
      <p>输入凭据后即可管理和使用强大的Cloudflare</p>
    </div>

    ${renderSavedAccount()}

    <form class="connect-card" id="cloudflare-connect-form">
      <div class="connect-card-title">
        <span>${icon("globe")}</span>
        <div>
          <h3>Cloudflare 凭据</h3>
          <p>凭据仅提交到本机 Node.js 服务端，不会暴露在浏览器接口响应中。</p>
        </div>
      </div>

      <label class="connect-field">
        <span>Cloudflare 账号邮箱</span>
        <input name="email" type="email" autocomplete="username" placeholder="your@email.com" />
      </label>
      <label class="connect-field">
        <span>Cloudflare API 密钥</span>
        <input name="globalApiKey" type="password" autocomplete="current-password" placeholder="您的 API 密钥" />
      </label>
      <p class="connect-help">点击右上角头像 -> 配置文件 -> API 令牌 -> 下拉到 API 密钥 -> 查看或创建 Global API Key</p>

      <button class="primary-button connect-submit" type="submit" ${state.connectingSession ? "disabled" : ""}>
        ${state.connectingSession ? "验证中..." : "验证并进入管理后台"}
      </button>
      ${state.sessionError ? `<div class="notice error-notice">${escapeHtml(state.sessionError)}</div>` : ""}
    </form>

    <div class="connect-register">
      <span>还没有 Cloudflare 账号？</span>
      <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noreferrer">立即注册</a>
      <p>注册后，您可以免费使用 Cloudflare 的 CDN、DNS 和其他强大功能</p>
    </div>
  `;
}

export function renderConnectView() {
  const app = document.querySelector("#app");
  app.className = "connect-root";

  app.innerHTML = `
    <main class="connect-page">
      <header class="connect-header">
        <div class="connect-brand">
          <img class="connect-brand-mark" src="/assets/spider-icon.png" alt="Spider" />
          <div>
            <h1>蜘蛛网络</h1>
            <p>好用的Cloudflare管理工具</p>
          </div>
        </div>
      </header>
      <section class="connect-section">
        <div class="connect-wrap">
          ${renderConnectBody()}
        </div>
      </section>
      <footer class="connect-footer">Power by Cloudflare 致敬赛博大善人</footer>
    </main>
  `;
}
