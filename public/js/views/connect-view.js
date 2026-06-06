import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

function renderConnectBody() {
  if (state.checkingSession) {
    return `
      <div class="connect-loading">
        <div class="spinner"></div>
        <strong>正在检查面板会话</strong>
      </div>
    `;
  }

  return `
    <div class="connect-heading">
      <h2>登录蜘蛛网络面板</h2>
      <p>登录后即可选择服务端环境变量中配置的 Cloudflare 账号</p>
    </div>

    <form class="connect-card" id="cloudflare-connect-form">
      <div class="connect-card-title">
        <span>${icon("shield")}</span>
        <div>
          <h3>面板登录</h3>
          <p>Cloudflare Global API Key 只从后端环境变量读取，不在浏览器输入或返回。</p>
        </div>
      </div>

      <label class="connect-field">
        <span>用户名</span>
        <input name="user" type="text" autocomplete="username" placeholder="admin" />
      </label>
      <label class="connect-field">
        <span>密码</span>
        <input name="password" type="password" autocomplete="current-password" placeholder="面板密码" />
      </label>
      <label class="connect-field">
        <span>2FA 验证码</span>
        <input name="auth" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6 位动态验证码" />
      </label>
      <p class="connect-help">服务端需配置 USER、PASSWORD、AUTH，并按 EMAIL1/CF_API1、EMAIL2/CF_API2 添加 Cloudflare 账号。</p>

      <div class="connect-security">
        <strong>安全保存方式</strong>
        <span>浏览器仅保存 HttpOnly 随机会话 Cookie，最长 30 天。</span>
        <span>Cookie、localStorage、接口响应和操作历史都不保存 Cloudflare API Key。</span>
      </div>

      <button class="primary-button connect-submit" type="submit" ${state.connectingSession ? "disabled" : ""}>
        ${state.connectingSession ? "登录中..." : "登录并进入管理后台"}
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
          <img class="connect-brand-mark" src="assets/spider-icon.png" alt="Spider" />
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
