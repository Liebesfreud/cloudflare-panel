import { isIP } from "node:net";
import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId, assertCloudflareResourceId } from "./cloudflare-id.js";

const firewallActions = new Set([
  "block",
  "allow",
  "challenge",
  "managed_challenge",
  "js_challenge",
  "log",
]);
const firewallRuleTypes = new Set(["ip", "country", "asn", "custom", "expression"]);
const rulesetPhases = new Set(["http_request_firewall_custom", "http_ratelimit"]);
const rulesetActions = new Set([
  "block",
  "challenge",
  "managed_challenge",
  "js_challenge",
  "log",
  "skip",
  "execute",
]);

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

function normalizeRulesetRule(rule = {}, ruleset = {}) {
  return {
    id: rule.id || "",
    rulesetId: ruleset.id || rule.ruleset_id || "",
    phase: ruleset.phase || "",
    action: rule.action || "block",
    description: rule.description || rule.ref || "",
    expression: rule.expression || "",
    enabled: rule.enabled !== false,
    ref: rule.ref || "",
    lastUpdated: rule.last_updated || "",
    version: rule.version || "",
    actionParameters: rule.action_parameters || null,
    ratelimit: rule.ratelimit || null,
  };
}

function normalizeRuleset(ruleset = {}, phase = "") {
  const rules = Array.isArray(ruleset.rules) ? ruleset.rules : [];

  return {
    id: ruleset.id || "",
    name: ruleset.name || (phase === "http_ratelimit" ? "Rate limiting rules" : "Custom WAF rules"),
    phase: ruleset.phase || phase,
    kind: ruleset.kind || "zone",
    version: ruleset.version || "",
    lastUpdated: ruleset.last_updated || "",
    rules: rules.map((rule) => normalizeRulesetRule(rule, { ...ruleset, phase: ruleset.phase || phase })),
  };
}

function normalizeRulesetPhase(input = {}) {
  const phase = String(input.phase || "http_request_firewall_custom").trim();

  if (!rulesetPhases.has(phase)) {
    throw new HttpError(400, "Ruleset 阶段无效");
  }

  return phase;
}

function normalizeRulesetRuleInput(input = {}, phase = "http_request_firewall_custom") {
  const action = String(input.action || "block").trim();
  const expression = String(input.expression || input.target || "").trim();
  const description = String(input.description || "").trim();
  const enabled = input.enabled === undefined ? true : Boolean(input.enabled);
  const body = { action, expression, description, enabled };

  if (!rulesetActions.has(action)) {
    throw new HttpError(400, "Ruleset 动作无效");
  }

  if (!expression || expression.length > 4096) {
    throw new HttpError(400, "Ruleset 表达式不能为空，且长度不能超过 4096");
  }

  if (!description || description.length > 500) {
    throw new HttpError(400, "Ruleset 描述不能为空，且长度不能超过 500");
  }

  if (phase === "http_ratelimit") {
    const requestsPerPeriod = Number(input.requestsPerPeriod || 60);
    const period = Number(input.period || 60);
    const mitigationTimeout = Number(input.mitigationTimeout || 600);

    if (!Number.isInteger(requestsPerPeriod) || requestsPerPeriod < 1) {
      throw new HttpError(400, "速率限制请求数必须是正整数");
    }

    if (![10, 60].includes(period)) {
      throw new HttpError(400, "速率限制统计周期只能是 10 或 60 秒");
    }

    if (!Number.isInteger(mitigationTimeout) || mitigationTimeout < 0) {
      throw new HttpError(400, "速率限制缓解时长必须是非负整数");
    }

    body.ratelimit = {
      characteristics: ["cf.colo.id", "ip.src"],
      period,
      requests_per_period: requestsPerPeriod,
      mitigation_timeout: mitigationTimeout,
    };
  }

  return body;
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

  async getRulesetState(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");
    const phases = ["http_request_firewall_custom", "http_ratelimit"];
    const results = await Promise.allSettled(
      phases.map((phase) => this.getRulesetEntrypoint(zoneId, phase))
    );
    const warnings = [];
    const rulesets = {};

    results.forEach((result, index) => {
      const phase = phases[index];

      if (result.status === "fulfilled") {
        rulesets[phase] = result.value;
        return;
      }

      if (result.reason?.statusCode === 404) {
        rulesets[phase] = normalizeRuleset({ phase, rules: [] }, phase);
        return;
      }

      warnings.push(`${phase}: ${result.reason.message}`);
      rulesets[phase] = normalizeRuleset({ phase, rules: [] }, phase);
    });

    return { rulesets, warnings };
  }

  async getRulesetEntrypoint(zoneId, phase) {
    assertCloudflareId(zoneId, "区域 ID");
    const normalizedPhase = normalizeRulesetPhase({ phase });
    const payload = await this.cloudflareClient.get(
      `zones/${zoneId}/rulesets/phases/${normalizedPhase}/entrypoint`
    );

    return normalizeRuleset(payload.result || {}, normalizedPhase);
  }

  async createRulesetRule(zoneId, input = {}) {
    assertCloudflareId(zoneId, "区域 ID");
    const phase = normalizeRulesetPhase(input);
    const rule = normalizeRulesetRuleInput(input, phase);
    const entrypoint = await this.getRulesetEntrypoint(zoneId, phase).catch((error) => {
      if (error.statusCode === 404) {
        return null;
      }

      throw error;
    });
    const payload = entrypoint?.id
      ? await this.cloudflareClient.post(
          `zones/${zoneId}/rulesets/phases/${phase}/entrypoint/rules`,
          rule
        )
      : await this.cloudflareClient.post(`zones/${zoneId}/rulesets`, {
          name: phase === "http_ratelimit" ? "Rate limiting rules" : "Custom WAF rules",
          description: "Managed by Cloudflare 优选面板",
          kind: "zone",
          phase,
          rules: [rule],
        });
    const resultRule = payload.result?.rules?.at?.(-1) || payload.result;

    return normalizeRulesetRule(resultRule || rule, {
      id: payload.result?.id || entrypoint?.id || "",
      phase,
    });
  }

  async updateRulesetRule(zoneId, rulesetId, ruleId, input = {}) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareResourceId(rulesetId, "Ruleset ID");
    assertCloudflareResourceId(ruleId, "Ruleset 规则 ID");
    const phase = normalizeRulesetPhase(input);
    const payload = await this.cloudflareClient.patch(
      `zones/${zoneId}/rulesets/${rulesetId}/rules/${ruleId}`,
      normalizeRulesetRuleInput(input, phase)
    );
    const updatedRule = Array.isArray(payload.result?.rules)
      ? payload.result.rules.find((rule) => rule.id === ruleId) || payload.result.rules.at(-1)
      : payload.result;

    return normalizeRulesetRule(updatedRule || {}, { id: rulesetId, phase });
  }

  async deleteRulesetRule(zoneId, rulesetId, ruleId) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareResourceId(rulesetId, "Ruleset ID");
    assertCloudflareResourceId(ruleId, "Ruleset 规则 ID");

    await this.cloudflareClient.delete(
      `zones/${zoneId}/rulesets/${rulesetId}/rules/${ruleId}`
    );

    return { id: ruleId, rulesetId };
  }
}
