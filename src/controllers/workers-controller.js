import { HttpError } from "../lib/http-error.js";
import { readJsonBody } from "../lib/request-body.js";

const maxWorkerJsonBodyBytes = 1024 * 1024 + 32 * 1024;

export class WorkersController {
  constructor({ workersService }) {
    this.workersService = workersService;
  }

  list = async ({ url }) => {
    const workers = await this.workersService.listWorkers(url.searchParams.get("accountId"));
    return { statusCode: 200, body: { workers } };
  };

  get = async ({ params, url }) => {
    const worker = await this.workersService.getWorker(
      params.scriptName,
      url.searchParams.get("accountId")
    );
    return { statusCode: 200, body: { worker } };
  };

  create = async ({ request }) => {
    const body = await readJsonBody(request, { maxBytes: maxWorkerJsonBodyBytes });

    if (!body.name) {
      throw new HttpError(400, "缺少 Worker 名称");
    }

    const worker = await this.workersService.uploadWorker(body.accountId, body.name, body);
    return { statusCode: 201, body: { worker } };
  };

  update = async ({ request, params, url }) => {
    const body = await readJsonBody(request, { maxBytes: maxWorkerJsonBodyBytes });
    const worker = await this.workersService.uploadWorker(
      body.accountId || url.searchParams.get("accountId"),
      params.scriptName,
      body
    );
    return { statusCode: 200, body: { worker } };
  };

  delete = async ({ params, url }) => {
    const result = await this.workersService.deleteWorker(
      url.searchParams.get("accountId"),
      params.scriptName
    );
    return { statusCode: 200, body: result };
  };

  updateSubdomain = async ({ request, params, url }) => {
    const body = await readJsonBody(request);
    const result = await this.workersService.updateSubdomain(
      body.accountId || url.searchParams.get("accountId"),
      params.scriptName,
      body
    );
    return { statusCode: 200, body: result };
  };

  updateSettings = async ({ request, params, url }) => {
    const body = await readJsonBody(request);
    const result = await this.workersService.updateSettings(
      body.accountId || url.searchParams.get("accountId"),
      params.scriptName,
      body
    );
    return { statusCode: 200, body: result };
  };

  putSecret = async ({ request, params, url }) => {
    const body = await readJsonBody(request);
    const secret = await this.workersService.putSecret(
      body.accountId || url.searchParams.get("accountId"),
      params.scriptName,
      body
    );
    return { statusCode: 200, body: { secret } };
  };

  deleteSecret = async ({ params, url }) => {
    const result = await this.workersService.deleteSecret(
      url.searchParams.get("accountId"),
      params.scriptName,
      params.secretName
    );
    return { statusCode: 200, body: result };
  };

  updateSchedules = async ({ request, params, url }) => {
    const body = await readJsonBody(request);
    const result = await this.workersService.updateSchedules(
      body.accountId || url.searchParams.get("accountId"),
      params.scriptName,
      body
    );
    return { statusCode: 200, body: result };
  };

  listDeployments = async ({ params, url }) => {
    const resolved = await this.workersService.resolveAccountId(url.searchParams.get("accountId"));
    const deployments = await this.workersService.listDeployments(
      resolved.accountId,
      params.scriptName
    );
    return { statusCode: 200, body: { accountId: resolved.accountId, deployments } };
  };

  createTail = async ({ params, url }) => {
    const result = await this.workersService.createTail(
      url.searchParams.get("accountId"),
      params.scriptName
    );
    return { statusCode: 201, body: result };
  };

  listQueues = async ({ url }) => {
    const queues = await this.workersService.listQueues(url.searchParams.get("accountId"));
    return { statusCode: 200, body: { queues } };
  };

  listRoutes = async ({ params, url }) => {
    const zoneId = url.searchParams.get("zoneId");

    if (!zoneId) {
      throw new HttpError(400, "缺少区域 ID");
    }

    const routes = await this.workersService.listRoutes(zoneId, params.scriptName);
    return { statusCode: 200, body: { routes } };
  };

  createRoute = async ({ request, params }) => {
    const body = await readJsonBody(request);

    if (!body.zoneId) {
      throw new HttpError(400, "缺少区域 ID");
    }

    const route = await this.workersService.createRoute(body.zoneId, {
      ...body,
      scriptName: params.scriptName,
    });
    return { statusCode: 201, body: { route } };
  };

  createPreferredRoute = async ({ request, params }) => {
    const body = await readJsonBody(request);

    if (!body.zoneId) {
      throw new HttpError(400, "缺少区域 ID");
    }

    const deployment = await this.workersService.createPreferredRoute(body.zoneId, {
      ...body,
      scriptName: params.scriptName,
    });
    return { statusCode: 201, body: { deployment } };
  };

  deleteRoute = async ({ params, url }) => {
    const zoneId = url.searchParams.get("zoneId");

    if (!zoneId) {
      throw new HttpError(400, "缺少区域 ID");
    }

    const result = await this.workersService.deleteRoute(zoneId, params.routeId);
    return { statusCode: 200, body: result };
  };

  listDomains = async ({ params, url }) => {
    const workers = await this.workersService.listWorkers(url.searchParams.get("accountId"));
    const domains = await this.workersService.listDomains(workers.accountId, {
      service: params.scriptName,
    });
    return { statusCode: 200, body: { domains } };
  };

  createDomain = async ({ request, params, url }) => {
    const body = await readJsonBody(request);
    const domain = await this.workersService.createDomain(
      body.accountId || url.searchParams.get("accountId"),
      {
        ...body,
        scriptName: params.scriptName,
      }
    );
    return { statusCode: 201, body: { domain } };
  };

  deleteDomain = async ({ params, url }) => {
    const result = await this.workersService.deleteDomain(
      url.searchParams.get("accountId"),
      params.domainId
    );
    return { statusCode: 200, body: result };
  };
}
