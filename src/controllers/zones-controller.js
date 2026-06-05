export class ZonesController {
  constructor({ zonesService }) {
    this.zonesService = zonesService;
  }

  list = async () => {
    const zones = await this.zonesService.listZones();
    return { statusCode: 200, body: { zones } };
  };
}
