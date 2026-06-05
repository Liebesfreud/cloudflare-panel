import { HttpError } from "../lib/http-error.js";
import { readJsonBody } from "../lib/request-body.js";

export class FirewallRulesController {
  constructor({ firewallRulesService }) {
    this.firewallRulesService = firewallRulesService;
  }

  list = async ({ params }) => {
    const [rules, rulesetState] = await Promise.all([
      this.firewallRulesService.listRules(params.zoneId),
      this.firewallRulesService.getRulesetState(params.zoneId),
    ]);
    return {
      statusCode: 200,
      body: {
        rules,
        rulesets: rulesetState.rulesets,
        warnings: rulesetState.warnings,
      },
    };
  };

  create = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const rule = await this.firewallRulesService.createRule(params.zoneId, body);
    return { statusCode: 201, body: { rule } };
  };

  update = async ({ request, params }) => {
    if (!params.ruleId) {
      throw new HttpError(400, "缺少防火墙规则 ID");
    }

    const body = await readJsonBody(request);
    const rule = await this.firewallRulesService.updateRule(
      params.zoneId,
      params.ruleId,
      body
    );
    return { statusCode: 200, body: { rule } };
  };

  delete = async ({ params }) => {
    if (!params.ruleId) {
      throw new HttpError(400, "缺少防火墙规则 ID");
    }

    const result = await this.firewallRulesService.deleteRule(params.zoneId, params.ruleId);
    return { statusCode: 200, body: result };
  };

  createRulesetRule = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const rule = await this.firewallRulesService.createRulesetRule(params.zoneId, body);
    return { statusCode: 201, body: { rule } };
  };

  updateRulesetRule = async ({ request, params }) => {
    if (!params.rulesetId || !params.ruleId) {
      throw new HttpError(400, "缺少 Ruleset 或规则 ID");
    }

    const body = await readJsonBody(request);
    const rule = await this.firewallRulesService.updateRulesetRule(
      params.zoneId,
      params.rulesetId,
      params.ruleId,
      body
    );
    return { statusCode: 200, body: { rule } };
  };

  deleteRulesetRule = async ({ params }) => {
    if (!params.rulesetId || !params.ruleId) {
      throw new HttpError(400, "缺少 Ruleset 或规则 ID");
    }

    const result = await this.firewallRulesService.deleteRulesetRule(
      params.zoneId,
      params.rulesetId,
      params.ruleId
    );
    return { statusCode: 200, body: result };
  };
}
