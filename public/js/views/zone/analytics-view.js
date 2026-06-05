import { icon } from "../../icons.js";
import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";

const rangeLabels = {
  "24h": "最近 24 小时",
  "7d": "最近 7 天",
  "30d": "最近 30 天",
  custom: "自定义范围",
};

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value) || 0);
}

function formatBytes(value, unit = "auto") {
  const bytes = Number(value) || 0;

  if (unit === "GB") {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function rangeLabel() {
  return rangeLabels[state.analyticsRange] || rangeLabels["7d"];
}

function totals() {
  return state.analytics?.totals || {};
}

function trend() {
  return Array.isArray(state.analytics?.trend) ? state.analytics.trend : [];
}

function getTotal(key) {
  return Number(totals()[key]) || 0;
}

function peakBy(key) {
  return Math.max(...trend().map((item) => Number(item[key]) || 0), 0);
}

function averageDaily(key) {
  const rows = trend();

  if (!rows.length) {
    return 0;
  }

  return rows.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) / rows.length;
}

function renderRangeButton(value, label) {
  const active = state.analyticsRange === value;

  return `
    <button
      class="${active ? "primary-button" : "secondary-button"} analytics-range-button"
      type="button"
      data-analytics-range="${escapeHtml(value)}"
      ${state.loadingAnalytics ? "disabled" : ""}
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderCustomRangeForm() {
  return `
    <form class="analytics-date-form" id="analytics-range-form">
      <input name="startDate" type="date" value="${escapeHtml(state.analyticsStartDate)}" />
      <input name="endDate" type="date" value="${escapeHtml(state.analyticsEndDate)}" />
      <button class="secondary-button analytics-range-button" type="submit" ${state.loadingAnalytics ? "disabled" : ""}>查询</button>
    </form>
  `;
}

function renderMainMetric({ label, value, description, tone }) {
  return `
    <section class="analytics-main-metric ${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(description)}</small>
    </section>
  `;
}

function renderMainMetrics() {
  return `
    <div class="analytics-main-grid">
      ${renderMainMetric({
        label: "总请求数",
        value: formatNumber(getTotal("requests")),
        description: rangeLabel(),
        tone: "blue",
      })}
      ${renderMainMetric({
        label: "带宽使用",
        value: formatBytes(getTotal("bytes"), "GB"),
        description: rangeLabel(),
        tone: "green",
      })}
      ${renderMainMetric({
        label: "独立访客",
        value: formatNumber(getTotal("uniques")),
        description: rangeLabel(),
        tone: "purple",
      })}
      ${renderMainMetric({
        label: "威胁拦截",
        value: formatNumber(getTotal("threats")),
        description: rangeLabel(),
        tone: "red",
      })}
    </div>
  `;
}

function renderCacheMetrics() {
  const bytes = getTotal("bytes");
  const cachedBytes = getTotal("cachedBytes");
  const bandwidthSaved = bytes > 0 ? (cachedBytes / bytes) * 100 : 0;

  return `
    <div class="analytics-cache-grid">
      <section class="analytics-small-card">
        <span>缓存命中率</span>
        <strong class="success">${formatPercent(getTotal("cacheHitRate"))}</strong>
        <small>缓存/总请求</small>
      </section>
      <section class="analytics-small-card">
        <span>缓存字节数</span>
        <strong class="info">${formatBytes(cachedBytes, "GB")}</strong>
        <small>已缓存数据</small>
      </section>
      <section class="analytics-small-card">
        <span>带宽节省</span>
        <strong class="accent">${formatPercent(bandwidthSaved)}</strong>
        <small>缓存/总带宽</small>
      </section>
    </div>
  `;
}

function renderDailyTraffic() {
  const rows = trend();

  return `
    <section class="analytics-card">
      <h3>每日流量统计</h3>
      ${
        rows.length
          ? `<div class="analytics-daily-list">
              ${rows
                .map(
                  (item) => `
                    <div class="analytics-daily-row">
                      <span>${escapeHtml(item.date || "-")}</span>
                      <div>
                        <em>请求: <strong>${formatNumber(item.requests)}</strong></em>
                        <em>带宽: <strong>${formatBytes(item.bytes)}</strong></em>
                        <em>访客: <strong>${formatNumber(item.uniques)}</strong></em>
                        <em>缓存: <strong class="success">${formatPercent(item.cacheHitRate)}</strong></em>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : `<div class="analytics-placeholder">
              <span>${icon("grid")}</span>
              <p>点击“刷新数据”按钮获取分析数据</p>
            </div>`
      }
    </section>
  `;
}

function renderStatLine(label, value, tone = "") {
  return `
    <div class="analytics-stat-line">
      <span>${escapeHtml(label)}</span>
      <strong class="${escapeHtml(tone)}">${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderRequestStats() {
  const requests = getTotal("requests");
  const cachedRequests = getTotal("cachedRequests");
  const uncachedRequests = Math.max(0, requests - cachedRequests);
  const encryptedRequests = getTotal("encryptedRequests");

  return `
    <section class="analytics-card">
      <h3>请求类型统计</h3>
      <div class="analytics-stat-list">
        ${renderStatLine("总请求数", `${formatNumber(requests)} (100%)`)}
        ${renderStatLine("缓存命中", `${formatNumber(cachedRequests)} (${formatPercent(getTotal("cacheHitRate"))})`, "success")}
        ${renderStatLine("未缓存", `${formatNumber(uncachedRequests)} (${formatPercent(requests ? (uncachedRequests / requests) * 100 : 0)})`, "warning")}
        ${renderStatLine("加密请求", `${formatNumber(encryptedRequests)} (${formatPercent(getTotal("encryptedRate"))})`, "info")}
        ${renderStatLine("页面浏览量", formatNumber(getTotal("pageViews")))}
      </div>
    </section>
  `;
}

function renderThreatStats() {
  const requests = getTotal("requests");
  const threats = getTotal("threats");
  const rows = trend();
  const peakThreatRow = rows.reduce(
    (peak, item) => ((Number(item.threats) || 0) > (Number(peak?.threats) || 0) ? item : peak),
    rows[0] || null
  );

  return `
    <section class="analytics-card">
      <h3>威胁分析</h3>
      <div class="analytics-stat-list">
        ${renderStatLine("总威胁", formatNumber(threats), "danger")}
        ${renderStatLine("威胁率", formatPercent(requests ? (threats / requests) * 100 : 0))}
        ${renderStatLine("最高威胁日", peakThreatRow && peakThreatRow.threats > 0 ? peakThreatRow.date : "无")}
        ${renderStatLine("平均每日威胁", formatNumber(Math.round(averageDaily("threats"))))}
      </div>
    </section>
  `;
}

function renderBandwidthStats() {
  return `
    <section class="analytics-card">
      <h3>带宽统计</h3>
      <div class="analytics-stat-list">
        ${renderStatLine("总带宽", formatBytes(getTotal("bytes"), "GB"))}
        ${renderStatLine("缓存带宽", formatBytes(getTotal("cachedBytes"), "GB"), "success")}
        ${renderStatLine("加密带宽", formatBytes(getTotal("encryptedBytes"), "GB"), "info")}
        ${renderStatLine("平均每日带宽", formatBytes(averageDaily("bytes"), "GB"))}
      </div>
    </section>
  `;
}

function renderPerformanceStats() {
  const requests = getTotal("requests");
  const bytes = getTotal("bytes");

  return `
    <section class="analytics-card">
      <h3>性能指标</h3>
      <div class="analytics-stat-list">
        ${renderStatLine("平均请求大小", requests ? formatBytes(bytes / requests) : "-")}
        ${renderStatLine("SSL/TLS 加密率", formatPercent(getTotal("encryptedRate")), "info")}
        ${renderStatLine("峰值日请求", formatNumber(peakBy("requests")))}
        ${renderStatLine("峰值日带宽", formatBytes(peakBy("bytes"), "GB"))}
      </div>
    </section>
  `;
}

function renderRankList(title, items, emptyText) {
  return `
    <section class="analytics-card analytics-rank-card">
      <h3>${escapeHtml(title)}</h3>
      ${
        items.length
          ? `<div class="analytics-compact-ranks">
              ${items
                .slice(0, 5)
                .map(
                  (item) => `
                    <div>
                      <span>${escapeHtml(item.id || "unknown")}</span>
                      <strong>${formatNumber(item.requests)}</strong>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : `<div class="analytics-mini-empty">${escapeHtml(emptyText)}</div>`
      }
    </section>
  `;
}

function renderDistributionStats(analytics) {
  return `
    <div class="analytics-distribution-grid">
      ${renderRankList("国家/地区排行", analytics.topCountries || [], "暂无国家/地区数据")}
      ${renderRankList("响应状态码", analytics.topStatuses || [], "暂无状态码数据")}
      ${renderRankList("内容类型", analytics.topContentTypes || [], "暂无内容类型数据")}
    </div>
  `;
}

function renderSecurityEvents(analytics) {
  const warnings = Array.isArray(analytics.warnings) ? analytics.warnings : [];
  const events = Array.isArray(analytics.securityEvents) ? analytics.securityEvents : [];

  return `
    <section class="analytics-card">
      <h3>安全事件采样</h3>
      ${
        warnings.length
          ? `<div class="analytics-warning-list">${warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}</div>`
          : ""
      }
      ${
        events.length
          ? `<div class="analytics-security-list">
              ${events
                .slice(0, 8)
                .map(
                  (event) => `
                    <div class="analytics-security-row">
                      <div>
                        <strong>${escapeHtml(event.description || event.source || "Security Event")}</strong>
                        <span>${escapeHtml(event.ip || "-")} · ${escapeHtml(event.country || "-")} · ${escapeHtml(event.userAgent || "-")}</span>
                      </div>
                      <em>${escapeHtml(event.action || "unknown")} · ${formatNumber(event.count)}</em>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : `<div class="analytics-mini-empty">暂无安全事件采样数据</div>`
      }
    </section>
  `;
}

function renderAnalyticsContent() {
  const analytics = state.analytics;

  if (state.loadingAnalytics && !analytics) {
    return `
      <div class="analytics-empty-state">
        <div class="spinner"></div>
        <strong>正在读取分析统计</strong>
        <span>从 Cloudflare GraphQL 读取当前 Zone 的边缘请求数据。</span>
      </div>
    `;
  }

  if (state.analyticsError) {
    return `
      <div class="analytics-empty-state error-state">
        <strong>分析统计加载失败</strong>
        <span>${escapeHtml(state.analyticsError)}</span>
      </div>
    `;
  }

  if (!analytics) {
    return `
      <div class="analytics-empty-state">
        <strong>暂无分析数据</strong>
        <span>点击刷新数据后重新读取 Cloudflare 统计。</span>
      </div>
    `;
  }

  return `
    ${renderMainMetrics()}
    ${renderCacheMetrics()}
    ${renderDailyTraffic()}
    <div class="analytics-two-column">
      ${renderRequestStats()}
      ${renderThreatStats()}
    </div>
    <div class="analytics-two-column">
      ${renderBandwidthStats()}
      ${renderPerformanceStats()}
    </div>
    ${renderDistributionStats(analytics)}
    ${renderSecurityEvents(analytics)}
  `;
}

export function renderAnalyticsSettingsView() {
  const zone = state.selectedZone || { id: "", name: "", status: "", plan: null };

  return `
    <div class="analytics-page">
      <div class="analytics-top-row">
        <button class="analytics-back-button" type="button" id="back-to-domains">← 返回域名列表</button>
        <button class="primary-button analytics-refresh-main" type="button" id="refresh-zone-settings" ${state.loadingAnalytics ? "disabled" : ""}>
          ${state.loadingAnalytics ? "刷新中..." : "刷新数据"}
        </button>
      </div>

      <section class="panel analytics-original-panel">
        <div class="analytics-original-heading">
          <div>
            <h2>
              <span>${icon("grid")}</span>
              分析统计
            </h2>
            <p>当前域名: ${escapeHtml(zone.name || "Loading")} - ${escapeHtml(rangeLabel())}</p>
          </div>
          <div class="analytics-range-actions">
            ${renderRangeButton("24h", "24小时")}
            ${renderRangeButton("7d", "7天")}
            ${renderRangeButton("30d", "30天")}
            ${renderCustomRangeForm()}
          </div>
        </div>
        <div class="analytics-original-body">
          ${renderAnalyticsContent()}
        </div>
      </section>
    </div>
  `;
}
