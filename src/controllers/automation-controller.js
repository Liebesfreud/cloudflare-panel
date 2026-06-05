import { readJsonBody } from "../lib/request-body.js";

export class AutomationController {
  constructor({ automationService }) {
    this.automationService = automationService;
  }

  get = async ({ params }) => {
    const automation = await this.automationService.getState(params.zoneId);
    return { statusCode: 200, body: { automation } };
  };

  updateSettings = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const automation = await this.automationService.updateSettings(params.zoneId, body);
    return { statusCode: 200, body: { automation } };
  };

  updateDnsProxy = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const automation = await this.automationService.updateDnsProxy(params.zoneId, body);
    return { statusCode: 200, body: { automation } };
  };

  updateFirewall = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const automation = await this.automationService.updateFirewallToggle(
      params.zoneId,
      params.ruleKey,
      body
    );
    return { statusCode: 200, body: { automation } };
  };

  updatePageRule = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const automation = await this.automationService.updatePageRuleToggle(
      params.zoneId,
      params.ruleKey,
      body
    );
    return { statusCode: 200, body: { automation } };
  };

  updateTieredCaching = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const automation = await this.automationService.updateTieredCaching(
      params.zoneId,
      body
    );
    return { statusCode: 200, body: { automation } };
  };

  applyPreset = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const automation = await this.automationService.applyPreset(params.zoneId, body);
    return { statusCode: 200, body: { automation } };
  };
}
