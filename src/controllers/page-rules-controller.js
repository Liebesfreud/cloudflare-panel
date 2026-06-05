import { HttpError } from "../lib/http-error.js";
import { readJsonBody } from "../lib/request-body.js";

export class PageRulesController {
  constructor({ pageRulesService }) {
    this.pageRulesService = pageRulesService;
  }

  list = async ({ params }) => {
    const rules = await this.pageRulesService.listRules(params.zoneId);
    return { statusCode: 200, body: { rules } };
  };

  create = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const rule = await this.pageRulesService.createRule(params.zoneId, body);
    return { statusCode: 201, body: { rule } };
  };

  update = async ({ request, params }) => {
    if (!params.ruleId) {
      throw new HttpError(400, "缺少页面规则 ID");
    }

    const body = await readJsonBody(request);
    const rule = await this.pageRulesService.updateRule(params.zoneId, params.ruleId, body);
    return { statusCode: 200, body: { rule } };
  };

  delete = async ({ params }) => {
    if (!params.ruleId) {
      throw new HttpError(400, "缺少页面规则 ID");
    }

    const result = await this.pageRulesService.deleteRule(params.zoneId, params.ruleId);
    return { statusCode: 200, body: result };
  };
}
