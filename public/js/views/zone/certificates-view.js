import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("zh-CN");
}

function renderCertificateList() {
  if (state.loadingCertificates && state.customCertificates.length === 0) {
    return `
      <div class="certificate-inline-state">
        <div class="spinner"></div>
        <span>正在读取证书状态...</span>
      </div>
    `;
  }

  if (state.certificateError) {
    return `
      <div class="certificate-inline-state error-state">
        <strong>证书状态加载失败</strong>
        <span>${escapeHtml(state.certificateError)}</span>
      </div>
    `;
  }

  if (state.customCertificates.length === 0) {
    return `<div class="certificate-empty">当前账户无自定义证书（需要企业版）</div>`;
  }

  return `
    <div class="certificate-list">
      ${state.customCertificates
        .map(
          (certificate) => `
            <article class="certificate-item">
              <div>
                <strong>${escapeHtml(certificate.hosts?.join(", ") || "Unknown")}</strong>
                <span>到期时间: ${escapeHtml(formatDate(certificate.expiresOn))}</span>
                <span>状态: ${escapeHtml(certificate.status || "unknown")}</span>
              </div>
              <button
                class="secondary-button certificate-delete-button delete-certificate"
                type="button"
                data-certificate-id="${escapeHtml(certificate.id)}"
                aria-label="删除证书"
                title="删除证书"
                ${state.deletingCertificateId === certificate.id ? "disabled" : ""}
              >
                ${icon("trash")}
              </button>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderWarnings() {
  if (!state.certificateWarnings.length) {
    return "";
  }

  return `
    <div class="certificate-warning-list">
      ${state.certificateWarnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}
    </div>
  `;
}

export function renderCertificatesSettingsView() {
  const zone = state.selectedZone || { name: "Loading" };
  const universalEnabled = state.universalSsl?.enabled !== false;

  return `
    <div class="certificates-page">
      <div class="certificate-back-row">
        <button class="certificate-back-button" type="button" id="back-to-domains">← 返回域名列表</button>
      </div>

      ${state.notice ? `<div class="notice page-notice">${escapeHtml(state.notice)}</div>` : ""}

      <section class="panel certificates-panel">
        <div class="certificates-heading">
          <h2>
            <span>${icon("shield")}</span>
            自定义证书管理
          </h2>
          <p>当前域名: ${escapeHtml(zone.name || "Loading")}</p>
        </div>

        <div class="certificates-body">
          <section class="certificate-upload-box">
            <h3>上传自定义 SSL 证书</h3>
            <p>上传您自己的 SSL/TLS 证书和私钥</p>

            <label>
              <span>证书（Certificate）</span>
              <textarea disabled placeholder="Paste certificate content here"></textarea>
            </label>
            <label>
              <span>私钥（Private Key）</span>
              <textarea disabled placeholder="Paste private key content here"></textarea>
            </label>
            <label>
              <span>证书链（可选）</span>
              <textarea class="short" disabled placeholder="中间证书和根证书（可选）"></textarea>
            </label>

            <button class="secondary-button certificate-upload-button" type="button" disabled>
              上传证书
            </button>
            <div class="certificate-plan-warning">
              自定义证书功能需要 Cloudflare 企业版或更高版本账户。<br />
              免费版和 Pro 版账户自动使用 Cloudflare Universal SSL。
            </div>
          </section>

          <section class="certificate-status-box">
            <div class="certificate-status-heading">
              <h3>证书状态监控</h3>
              <button
                class="secondary-button certificate-refresh-button"
                type="button"
                id="refresh-certificates"
                ${state.loadingCertificates ? "disabled" : ""}
              >
                ${state.loadingCertificates ? "刷新中..." : "刷新状态"}
              </button>
            </div>

            ${renderWarnings()}

            <div class="certificate-universal-row">
              <span>Cloudflare Universal SSL</span>
              <strong class="${universalEnabled ? "enabled" : "disabled"}">
                ${universalEnabled ? "● 已激活" : "● 未激活"}
              </strong>
            </div>

            <div class="certificate-universal-note">
              <p>您的域名已自动启用 Cloudflare Universal SSL，提供免费的 HTTPS 加密。</p>
              <ul>
                <li>自动颁发和续期</li>
                <li>支持 TLS 1.2 和 TLS 1.3</li>
                <li>覆盖主域名和一级子域名</li>
              </ul>
            </div>

            ${renderCertificateList()}
          </section>

          <section class="certificate-reminder-box">
            <h3>证书到期提醒</h3>
            <p>自动监控证书有效期并在到期前提醒</p>
            <div class="certificate-reminder-row">
              <div>
                <strong>提醒时间</strong>
                <span>证书到期前 30 天</span>
              </div>
              <button class="secondary-button" type="button">配置</button>
            </div>
            <div class="certificate-reminder-row">
              <div>
                <strong>通知方式</strong>
                <span>邮件通知</span>
              </div>
              <button class="secondary-button" type="button">修改</button>
            </div>
          </section>
        </div>
      </section>
    </div>
  `;
}
