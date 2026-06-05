import { sendJson } from "./lib/http-response.js";
import { toHttpError } from "./lib/http-error.js";
import { serveStaticFile } from "./middleware/static-files.js";
import { createApiRouter } from "./routes/api-routes.js";

export function createApp({
  analyticsController,
  automationController,
  cacheSettingsController,
  certificatesController,
  credentialsController,
  developerResourcesController,
  dnsRecordsController,
  firewallRulesController,
  pageRulesController,
  speedDeployController,
  workersController,
  zonesController,
}) {
  const apiRouter = createApiRouter({
    analyticsController,
    automationController,
    cacheSettingsController,
    certificatesController,
    credentialsController,
    developerResourcesController,
    dnsRecordsController,
    firewallRulesController,
    pageRulesController,
    speedDeployController,
    workersController,
    zonesController,
  });

  return async function app(request, response) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const handler = apiRouter.match(request, url);

      if (handler) {
        const result = await handler({ request, url });
        sendJson(response, result.statusCode, result.body);
        return;
      }

      if (apiRouter.isApiPath(url)) {
        sendJson(response, 404, { error: "接口不存在" });
        return;
      }

      await serveStaticFile(url, response);
    } catch (error) {
      const httpError = toHttpError(error);
      sendJson(response, httpError.statusCode, {
        error: httpError.message || "服务暂时不可用",
      });
    }
  };
}
