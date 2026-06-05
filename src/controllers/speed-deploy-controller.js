import { readJsonBody } from "../lib/request-body.js";

export class SpeedDeployController {
  constructor({ speedDeployService }) {
    this.speedDeployService = speedDeployService;
  }

  deploy = async ({ request, params }) => {
    const body = await readJsonBody(request);
    const deployment = await this.speedDeployService.deploy(params.zoneId, body);

    return { statusCode: 200, body: { deployment } };
  };
}
