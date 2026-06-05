import { readJsonBody } from "../lib/request-body.js";

export class SslSettingsController {
  constructor({ sslSettingsService }) {
    this.sslSettingsService = sslSettingsService;
  }

  get = async ({ params }) => {
    const ssl = await this.sslSettingsService.getSettings(params.zoneId);
    return { statusCode: 200, body: { ssl } };
  };

  update = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const ssl = await this.sslSettingsService.updateSettings(params.zoneId, body);
    return { statusCode: 200, body: { ssl } };
  };
}
