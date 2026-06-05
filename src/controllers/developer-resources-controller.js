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

  detail = async ({ params, url }) => {
    const resource = await this.developerResourcesService.getDetail(
      params.type,
      url.searchParams.get("accountId"),
      params.resourceId
    );
    return { statusCode: 200, body: { resource } };
  };

  updatePagesBuildConfig = async ({ params, request, url }) => {
    const body = await readJsonBody(request);
    const resource = await this.developerResourcesService.updatePagesBuildConfig(
      body.accountId || url.searchParams.get("accountId"),
      params.resourceId,
      body
    );
    return { statusCode: 200, body: { resource } };
  };

  queryD1 = async ({ params, request, url }) => {
    const body = await readJsonBody(request, { maxBytes: 64 * 1024 });
    const result = await this.developerResourcesService.queryD1(
      body.accountId || url.searchParams.get("accountId"),
      params.resourceId,
      body
    );
    return { statusCode: 200, body: { result } };
  };

  putR2Object = async ({ params, request, url }) => {
    const body = await readJsonBody(request, { maxBytes: 1024 * 1024 });
    const result = await this.developerResourcesService.putR2Object(
      body.accountId || url.searchParams.get("accountId"),
      params.resourceId,
      body
    );
    return { statusCode: 200, body: { result } };
  };

  deleteR2Object = async ({ params, url }) => {
    const result = await this.developerResourcesService.deleteR2Object(
      url.searchParams.get("accountId"),
      params.resourceId,
      url.searchParams.get("key")
    );
    return { statusCode: 200, body: result };
  };

  getKvValue = async ({ params, url }) => {
    const value = await this.developerResourcesService.getKvValue(
      url.searchParams.get("accountId"),
      params.resourceId,
      url.searchParams.get("key")
    );
    return { statusCode: 200, body: { value } };
  };

  putKvValue = async ({ params, request, url }) => {
    const body = await readJsonBody(request, { maxBytes: 256 * 1024 });
    const result = await this.developerResourcesService.putKvValue(
      body.accountId || url.searchParams.get("accountId"),
      params.resourceId,
      body
    );
    return { statusCode: 200, body: { result } };
  };

  deleteKvValue = async ({ params, url }) => {
    const result = await this.developerResourcesService.deleteKvValue(
      url.searchParams.get("accountId"),
      params.resourceId,
      url.searchParams.get("key")
    );
    return { statusCode: 200, body: result };
  };

  updateTunnelConfiguration = async ({ params, request, url }) => {
    const body = await readJsonBody(request, { maxBytes: 64 * 1024 });
    const result = await this.developerResourcesService.updateTunnelConfiguration(
      body.accountId || url.searchParams.get("accountId"),
      params.resourceId,
      body
    );
    return { statusCode: 200, body: { result } };
  };

  getTunnelToken = async ({ params, url }) => {
    const token = await this.developerResourcesService.getTunnelToken(
      url.searchParams.get("accountId"),
      params.resourceId
    );
    return { statusCode: 200, body: { token } };
  };
}
