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

function renderOriginCertificateList() {
  const certificates = Array.isArray(state.originCertificates) ? state.originCertificates : [];

  if (certificates.length === 0) {
    return `<div class="certificate-empty">暂无 Origin CA 证书</div>`;
  }

  return `
    <div class="certificate-list">
      ${certificates
        .map(
          (certificate) => `
            <article class="certificate-item">
              <div>
                <strong>${escapeHtml(certificate.hostnames?.join(", ") || certificate.id || "Origin CA")}</strong>
                <span>到期时间: ${escapeHtml(formatDate(certificate.expiresOn))}</span>
                <span>类型: ${escapeHtml(certificate.requestType || "origin-rsa")}</span>
              </div>
              <button
                class="secondary-button certificate-delete-button delete-origin-certificate"
                type="button"
                data-certificate-id="${escapeHtml(certificate.id)}"
                aria-label="删除 Origin CA 证书"
                title="删除 Origin CA 证书"
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
          <form class="certificate-upload-box" id="certificate-upload-form">
            <h3>上传自定义 SSL 证书</h3>
            <p>上传您自己的 SSL/TLS 证书和私钥</p>

            <label>
              <span>证书（Certificate）</span>
              <textarea name="certificate" placeholder="-----BEGIN CERTIFICATE-----" ${state.savingCertificate ? "disabled" : ""}></textarea>
            </label>
            <label>
              <span>私钥（Private Key）</span>
              <textarea name="privateKey" placeholder="-----BEGIN PRIVATE KEY-----" ${state.savingCertificate ? "disabled" : ""}></textarea>
            </label>
            <label>
              <span>证书链（可选）</span>
              <textarea class="short" name="certificateChain" placeholder="中间证书和根证书（可选）" ${state.savingCertificate ? "disabled" : ""}></textarea>
            </label>
            <div class="certificate-form-row">
              <label>
                <span>Bundle Method</span>
                <select name="bundleMethod" ${state.savingCertificate ? "disabled" : ""}>
                  <option value="ubiquitous">ubiquitous</option>
                  <option value="optimal">optimal</option>
                  <option value="force">force</option>
                </select>
              </label>
              <label>
                <span>优先级（可选）</span>
                <input name="priority" type="number" min="0" placeholder="0" ${state.savingCertificate ? "disabled" : ""} />
              </label>
            </div>

            <button class="secondary-button certificate-upload-button" type="submit" ${state.savingCertificate ? "disabled" : ""}>
              ${state.savingCertificate ? "处理中..." : "上传证书"}
            </button>
            <div class="certificate-plan-warning">
              私钥只会提交到本地后端再转发给 Cloudflare，不会写入前端状态或页面列表。
            </div>
          </form>

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

          <form class="certificate-reminder-box" id="origin-certificate-form">
            <h3>Origin CA 证书创建</h3>
            <p>创建安装在源站服务器上的 Cloudflare Origin CA 证书。</p>
            <label>
              <span>证书域名</span>
              <input name="hostnames" value="${escapeHtml(zone.name || "")}" placeholder="${escapeHtml(zone.name || "example.com")}, *.${escapeHtml(zone.name || "example.com")}" ${state.savingCertificate ? "disabled" : ""} />
            </label>
            <div class="certificate-form-row">
              <label>
                <span>证书类型</span>
                <select name="requestType" ${state.savingCertificate ? "disabled" : ""}>
                  <option value="origin-rsa">RSA</option>
                  <option value="origin-ecc">ECC</option>
                </select>
              </label>
              <label>
                <span>有效期（天）</span>
                <input name="requestedValidity" type="number" min="7" max="5475" value="5475" ${state.savingCertificate ? "disabled" : ""} />
              </label>
            </div>
            <label>
              <span>CSR（可选）</span>
              <textarea class="short" name="csr" placeholder="留空则由 Cloudflare 生成证书请求" ${state.savingCertificate ? "disabled" : ""}></textarea>
            </label>
            <button class="secondary-button certificate-upload-button" type="submit" ${state.savingCertificate ? "disabled" : ""}>
              ${state.savingCertificate ? "处理中..." : "创建 Origin CA"}
            </button>
            ${
              state.originCertificateCreated?.certificate
                ? `<label>
                    <span>最近创建的证书</span>
                    <textarea readonly>${escapeHtml(state.originCertificateCreated.certificate)}</textarea>
                  </label>`
                : ""
            }
            <div>
              <h3>Origin CA 证书列表</h3>
              ${renderOriginCertificateList()}
            </div>
          </form>
        </div>
      </section>
    </div>
  `;
}
