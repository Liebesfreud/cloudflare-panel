import { readJsonBody } from "../lib/request-body.js";

export class CacheSettingsController {
  constructor({ cacheSettingsService }) {
    this.cacheSettingsService = cacheSettingsService;
  }

  get = async ({ params }) => {
    const result = await this.cacheSettingsService.getSettings(params.zoneId);
    return { statusCode: 200, body: result };
  };

  update = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const result = await this.cacheSettingsService.updateSettings(params.zoneId, body);
    return { statusCode: 200, body: result };
  };

  purge = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const result = await this.cacheSettingsService.purgeCache(params.zoneId, body);
    return { statusCode: 200, body: result };
  };
}
