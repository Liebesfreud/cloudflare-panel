import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

const sampleRecords = [
  "A @ 192.0.2.10 1 true",
  "CNAME www example.com 1 false",
  "MX @ mail.example.com 300 false 10",
  'TXT @ "v=spf1 include:_spf.example.com ~all" 1',
];

export function renderDnsBulkForm() {
  return `
    <form class="panel dns-bulk-panel" id="dns-bulk-form">
      <div class="dns-form-heading">
        <div>
          <span class="section-kicker">Batch Records</span>
          <h2>批量添加 DNS 记录</h2>
        </div>
        <button class="ghost-button dns-bulk-close" type="button">取消</button>
      </div>

      <label class="field-label dns-bulk-field">
        <span>记录内容</span>
        <textarea
          class="dns-bulk-textarea"
          name="records"
          spellcheck="false"
          placeholder="${escapeHtml(sampleRecords.join("\n"))}"
          ${state.savingDnsBulk ? "disabled" : ""}
        >${escapeHtml(state.dnsBulkText)}</textarea>
      </label>

      <div class="dns-bulk-help">
        <span>格式：类型 名称 内容 TTL 是否代理 优先级；每行一条，空行和 # 注释会被忽略。</span>
        <span>TXT 内容包含空格时使用英文双引号包裹；TTL 可填 1 表示自动。</span>
      </div>

      <div class="form-actions">
        <button class="primary-button gradient-button" type="submit" ${state.savingDnsBulk ? "disabled" : ""}>
          ${icon("upload")}
          <span>${state.savingDnsBulk ? "添加中" : "批量添加"}</span>
        </button>
        <button class="secondary-button reset-button dns-bulk-close" type="button" ${state.savingDnsBulk ? "disabled" : ""}>
          <span>关闭</span>
        </button>
      </div>
    </form>
  `;
}
