import { readJsonBody } from "../lib/request-body.js";

export class ZonesController {
  constructor({ zonesService }) {
    this.zonesService = zonesService;
  }

  list = async () => {
    const zones = await this.zonesService.listZones();
    return { statusCode: 200, body: { zones } };
  };

  create = async ({ request }) => {
    const body = await readJsonBody(request);
    const zone = await this.zonesService.createZone(body);
    return { statusCode: 201, body: { zone } };
  };
}
