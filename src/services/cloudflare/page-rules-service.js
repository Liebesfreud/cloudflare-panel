import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId } from "./cloudflare-id.js";

const pageRuleStatusValues = new Set(["active", "disabled"]);
const cacheLevelValues = new Set([
  "bypass",
  "basic",
  "simplified",
  "aggressive",
  "cache_everything",
]);
const browserCacheTtlValues = new Set([3600, 14400, 86400, 604800]);
const securityLevelValues = new Set(["off", "low", "medium", "high"]);
const sslModeValues = new Set(["off", "flexible", "full", "strict"]);
const forwardingStatusCodes = new Set([301, 302]);

function readActionValue(actions, actionId) {
  return actions.find((action) => action.id === actionId)?.value ?? "";
}

function normalizePageRule(rule = {}) {
  const targets = Array.isArray(rule.targets) ? rule.targets : [];
  const actions = Array.isArray(rule.actions) ? rule.actions : [];
  const urlPattern =
    targets.find((target) => target.target === "url")?.constraint?.value || "";
  const forwarding = actions.find((action) => action.id === "forwarding_url");
  const alwaysUseHttps = actions.some((action) => action.id === "always_use_https")
    ? "on"
    : "";

  return {
    id: rule.id || "",
    urlPattern,
    status: pageRuleStatusValues.has(rule.status) ? rule.status : "disabled",
    priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : null,
    targets,
    actions,
    cacheLevel: String(readActionValue(actions, "cache_level") || ""),
    browserCacheTtl: String(readActionValue(actions, "browser_cache_ttl") || ""),
    securityLevel: String(readActionValue(actions, "security_level") || ""),
    ssl: String(readActionValue(actions, "ssl") || ""),
    alwaysUseHttps,
    forwardingType: forwarding?.value?.status_code
      ? String(forwarding.value.status_code)
      : "",
    forwardingUrl: forwarding?.value?.url || "",
    createdOn: rule.created_on || "",
    modifiedOn: rule.modified_on || "",
  };
}

function validateUrlPattern(value) {
  const urlPattern = String(value || "").trim();

  if (!urlPattern || urlPattern.length > 1024) {
    throw new HttpError(400, "URL 模式不能为空，且长度不能超过 1024");
  }

  if (!urlPattern.includes(".")) {
    throw new HttpError(400, "URL 模式至少需要包含域名，例如 *.example.com/*");
  }

  return urlPattern;
}

function validateOptionalValue(input, key, allowedValues, errorMessage) {
  const value = String(input[key] || "").trim();

  if (!value) {
    return "";
  }

  if (!allowedValues.has(value)) {
    throw new HttpError(400, errorMessage);
  }

  return value;
}

function normalizePageRuleInput(input = {}) {
  const urlPattern = validateUrlPattern(input.urlPattern);
  const status = String(input.status || "active").trim();

  if (!pageRuleStatusValues.has(status)) {
    throw new HttpError(400, "页面规则状态无效");
  }

  const forwardingType = String(input.forwardingType || "").trim();
  const alwaysUseHttps = String(input.alwaysUseHttps || "").trim();
  const cacheLevel = validateOptionalValue(
    input,
    "cacheLevel",
    cacheLevelValues,
    "缓存级别无效"
  );
  const securityLevel = validateOptionalValue(
    input,
    "securityLevel",
    securityLevelValues,
    "安全级别无效"
  );
  const ssl = validateOptionalValue(input, "ssl", sslModeValues, "SSL 模式无效");
  const actions = [];

  const browserCacheTtlRaw = String(input.browserCacheTtl || "").trim();
  let browserCacheTtl = "";

  if (browserCacheTtlRaw) {
    browserCacheTtl = Number(browserCacheTtlRaw);

    if (!browserCacheTtlValues.has(browserCacheTtl)) {
      throw new HttpError(400, "浏览器缓存 TTL 无效");
    }
  }

  if (forwardingType) {
    const statusCode = Number(forwardingType);

    if (!forwardingStatusCodes.has(statusCode)) {
      throw new HttpError(400, "URL 转发类型无效");
    }

    if (alwaysUseHttps === "on" || cacheLevel || browserCacheTtl || securityLevel || ssl) {
      throw new HttpError(400, "URL 转发不能与其他页面规则设置同时使用");
    }

    const forwardingUrl = String(input.forwardingUrl || "").trim();

    try {
      const parsedUrl = new URL(forwardingUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new HttpError(400, "目标 URL 必须是有效的 http:// 或 https:// 地址");
    }

    actions.push({
      id: "forwarding_url",
      value: {
        url: forwardingUrl,
        status_code: statusCode,
      },
    });
  } else if (alwaysUseHttps === "on") {
    if (cacheLevel || browserCacheTtl || securityLevel || ssl) {
      throw new HttpError(400, "始终 HTTPS 不能与其他页面规则设置同时使用");
    }

    actions.push({ id: "always_use_https" });
  } else {
    if (cacheLevel) {
      actions.push({ id: "cache_level", value: cacheLevel });
    }

    if (browserCacheTtl) {
      actions.push({ id: "browser_cache_ttl", value: browserCacheTtl });
    }

    if (securityLevel) {
      actions.push({ id: "security_level", value: securityLevel });
    }

    if (ssl) {
      actions.push({ id: "ssl", value: ssl });
    }
  }

  if (actions.length === 0) {
    throw new HttpError(400, "请至少选择一个页面规则设置");
  }

  return {
    targets: [
      {
        target: "url",
        constraint: {
          operator: "matches",
          value: urlPattern,
        },
      },
    ],
    actions,
    status,
  };
}

export class PageRulesService {
  constructor({ cloudflareClient, perPage = 50 }) {
    this.cloudflareClient = cloudflareClient;
    this.perPage = perPage;
  }

  async listRules(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");

    const rules = [];
    let page = 1;
    let totalPages = 1;

    do {
      const payload = await this.cloudflareClient.get(`zones/${zoneId}/pagerules`, {
        page,
        per_page: this.perPage,
      });

      if (!Array.isArray(payload.result)) {
        throw new HttpError(502, "Cloudflare 页面规则返回格式异常，请稍后重试。");
      }

      rules.push(...payload.result.map(normalizePageRule));

      const pageCount = Number(payload.result_info?.total_pages);
      const totalCount = Number(payload.result_info?.total_count);
      totalPages = Number.isFinite(pageCount)
        ? Math.max(1, pageCount)
        : Number.isFinite(totalCount)
          ? Math.max(1, Math.ceil(totalCount / this.perPage))
          : page;
      page += 1;
    } while (page <= totalPages);

    return rules.sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0));
  }

  async createRule(zoneId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    const payload = await this.cloudflareClient.post(
      `zones/${zoneId}/pagerules`,
      normalizePageRuleInput(input)
    );

    return normalizePageRule(payload.result || {});
  }

  async updateRule(zoneId, ruleId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareId(ruleId, "页面规则 ID");
    const payload = await this.cloudflareClient.patch(
      `zones/${zoneId}/pagerules/${ruleId}`,
      normalizePageRuleInput(input)
    );

    return normalizePageRule(payload.result || {});
  }

  async deleteRule(zoneId, ruleId) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareId(ruleId, "页面规则 ID");
    const payload = await this.cloudflareClient.delete(`zones/${zoneId}/pagerules/${ruleId}`);

    return { id: payload.result?.id || ruleId };
  }
}
