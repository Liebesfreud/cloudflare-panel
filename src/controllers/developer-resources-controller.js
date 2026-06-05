import { HttpError } from "../lib/http-error.js";
import { readJsonBody } from "../lib/request-body.js";

export class DeveloperResourcesController {
  constructor({ developerResourcesService }) {
    this.developerResourcesService = developerResourcesService;
  }

  list = async ({ params, url }) => {
    const resources = await this.developerResourcesService.list(
      params.type,
      url.searchParams.get("accountId")
    );
    return { statusCode: 200, body: { resources } };
  };

  create = async ({ params, request, url }) => {
    const body = await readJsonBody(request);

    if (!body.name) {
      throw new HttpError(400, "缺少资源名称");
    }

    const resource = await this.developerResourcesService.create(
      params.type,
      body.accountId || url.searchParams.get("accountId"),
      body
    );
    return { statusCode: 201, body: { resource } };
  };

  delete = async ({ params, url }) => {
    const result = await this.developerResourcesService.delete(
      params.type,
      url.searchParams.get("accountId"),
      params.resourceId
    );
    return { statusCode: 200, body: result };
  };
}
