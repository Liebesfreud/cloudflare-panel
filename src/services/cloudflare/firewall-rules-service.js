import { isIP } from "node:net";
import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId } from "./cloudflare-id.js";

const firewallActions = new Set([
  "block",
  "allow",
  "challenge",
  "managed_challenge",
  "js_challenge",
  "log",
]);
const firewallRuleTypes = new Set(["ip", "country", "asn", "custom", "expression"]);

function quoteExpressionValue(value) {
  return JSON.stringify(value);
}

function normalizeFirewallRule(rule) {
  const filter = rule.filter || {};

  return {
    id: rule.id,
    action: rule.action || "block",
    description: rule.description || filter.description || "",
    filterDescription: filter.description || "",
    expression: filter.expression || "",
    filterId: filter.id || "",
    paused: Boolean(rule.paused || filter.paused),
    priority: rule.priority ?? null,
    ref: rule.ref || filter.ref || "",
    createdOn: rule.created_on || filter.created_on || "",
    modifiedOn: rule.modified_on || filter.modified_on || "",
  };
}

function buildExpression(type, target) {
  if (type === "ip") {
    if (!isIP(target)) {
      throw new HttpError(400, "IP 地址格式无效");
    }

    return `ip.src eq ${target}`;
  }

  if (type === "country") {
    const country = target.toUpperCase();

    if (!/^[A-Z]{2}$/.test(country)) {
      throw new HttpError(400, "国家/地区代码必须是 2 位字母，例如 CN、US");
    }

    return `ip.geoip.country eq ${quoteExpressionValue(country)}`;
  }

  if (type === "asn") {
    const asn = Number(target);

    if (!Number.isInteger(asn) || asn < 1 || asn > 4_294_967_295) {
      throw new HttpError(400, "ASN 必须是有效的正整数");
    }

    return `ip.geoip.asnum eq ${asn}`;
  }

  return target;
}

function normalizeInput(input = {}, { defaultPaused = false } = {}) {
  const type = String(input.type || "").trim();
  const action = String(input.action || "").trim();
  const target = String(input.target || "").trim();
  const description = String(input.description || "").trim();
  const expression = String(input.expression || "").trim();
  const isCustomExpression = type === "custom" || type === "expression";
  const condition = isCustomExpression ? expression || target : target;

  if (!firewallRuleTypes.has(type)) {
    throw new HttpError(400, "防火墙规则类型无效");
  }

  if (!firewallActions.has(action)) {
    throw new HttpError(400, "防火墙动作无效");
  }

  if (!condition || condition.length > 4096) {
    throw new HttpError(400, "规则条件不能为空，且长度不能超过 4096");
  }

  const ruleExpression = isCustomExpression ? condition : buildExpression(type, condition);
  const ruleDescription =
    description || (isCustomExpression ? "面板自定义表达式规则" : `面板规则: ${type} ${condition}`);

  if (ruleDescription.length > 500) {
    throw new HttpError(400, "规则描述长度不能超过 500");
  }

  const paused =
    typeof input.paused === "boolean" ? input.paused : Boolean(defaultPaused);

  return {
    action,
    description: ruleDescription,
    filter: {
      description: ruleDescription,
      expression: ruleExpression,
      paused,
    },
    paused,
  };
}

function normalizeCreateInput(input = {}) {
  return normalizeInput(input, { defaultPaused: false });
}

function normalizeUpdateInput(input = {}) {
  const normalized = normalizeInput(input, { defaultPaused: input.paused });
  const filterId = String(input.filterId || "").trim();

  if (filterId) {
    assertCloudflareId(filterId, "防火墙过滤器 ID");
    normalized.filter.id = filterId;
  }

  return normalized;
}

export class FirewallRulesService {
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
      const payload = await this.cloudflareClient.get(`zones/${zoneId}/firewall/rules`, {
        page,
        per_page: this.perPage,
      });

      if (!Array.isArray(payload.result)) {
        throw new HttpError(502, "Cloudflare 防火墙规则返回格式异常，请稍后重试。");
      }

      rules.push(...payload.result.map(normalizeFirewallRule));

      const totalCount = Number(payload.result_info?.total_count);
      totalPages = Number.isFinite(totalCount)
        ? Math.max(1, Math.ceil(totalCount / this.perPage))
        : page;
      page += 1;
    } while (page <= totalPages);

    return rules;
  }

  async createRule(zoneId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    const payload = await this.cloudflareClient.post(
      `zones/${zoneId}/firewall/rules`,
      normalizeCreateInput(input)
    );
    const result = Array.isArray(payload.result) ? payload.result[0] : payload.result;

    return normalizeFirewallRule(result || {});
  }

  async updateRule(zoneId, ruleId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareId(ruleId, "防火墙规则 ID");
    const payload = await this.cloudflareClient.patch(
      `zones/${zoneId}/firewall/rules/${ruleId}`,
      normalizeUpdateInput(input)
    );
    const result = Array.isArray(payload.result) ? payload.result[0] : payload.result;

    return normalizeFirewallRule(result || {});
  }

  async deleteRule(zoneId, ruleId) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareId(ruleId, "防火墙规则 ID");
    const payload = await this.cloudflareClient.delete(
      `zones/${zoneId}/firewall/rules/${ruleId}`
    );

    return { id: payload.result?.id || ruleId };
  }
}
