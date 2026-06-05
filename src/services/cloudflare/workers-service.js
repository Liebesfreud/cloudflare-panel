import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId, assertCloudflareResourceId } from "./cloudflare-id.js";

const workerNamePattern = /^[a-z0-9-]+$/;
const maxWorkerScriptBytes = 1024 * 1024;

export const defaultWorkerScript = `addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World!'));
});`;

function assertWorkerName(value) {
  const workerName = String(value || "").trim();

  if (!workerName || workerName.length > 63 || !workerNamePattern.test(workerName)) {
    throw new HttpError(400, "Worker 名称只能包含小写字母、数字和连字符，长度不能超过 63");
  }

  if (workerName.startsWith("-") || workerName.endsWith("-")) {
    throw new HttpError(400, "Worker 名称不能以连字符开头或结尾");
  }

  return workerName;
}

function assertScriptContent(value) {
  const script = String(value || "").trimEnd();
  const scriptBytes = Buffer.byteLength(script, "utf8");

  if (!script) {
    throw new HttpError(400, "Worker 脚本代码不能为空");
  }

  if (scriptBytes > maxWorkerScriptBytes) {
    throw new HttpError(413, "Worker 脚本代码不能超过 1MB");
  }

  return script;
}

function normalizeAccount(account = {}) {
  return {
    id: account.id || "",
    name: account.name || account.id || "Cloudflare Account",
    type: account.type || "",
  };
}

function normalizeWorker(worker = {}) {
  return {
    id: worker.id || worker.name || "",
    name: worker.id || worker.name || "",
    etag: worker.etag || "",
    handlers: Array.isArray(worker.handlers) ? worker.handlers : [],
    compatibilityDate: worker.compatibility_date || "",
    compatibilityFlags: Array.isArray(worker.compatibility_flags)
      ? worker.compatibility_flags
      : [],
    createdOn: worker.created_on || "",
    modifiedOn: worker.modified_on || "",
    usageModel: worker.usage_model || "",
    logpush: Boolean(worker.logpush),
  };
}

function normalizeRoute(route = {}) {
  return {
    id: route.id || "",
    pattern: route.pattern || "",
    script: route.script || "",
  };
}

function normalizeDomain(domain = {}) {
  return {
    id: domain.id || "",
    certId: domain.cert_id || "",
    environment: domain.environment || "production",
    hostname: domain.hostname || "",
    service: domain.service || "",
    zoneId: domain.zone_id || "",
    zoneName: domain.zone_name || "",
  };
}

function normalizeSubdomainStatus(status = {}) {
  return {
    enabled: Boolean(status.enabled),
    previewsEnabled: Boolean(status.previews_enabled),
  };
}

function normalizeSettings(settings = {}) {
  const bindings = Array.isArray(settings.bindings) ? settings.bindings : [];

  return {
    bindings,
    usageModel: settings.usage_model || "",
    compatibilityDate: settings.compatibility_date || "",
    compatibilityFlags: Array.isArray(settings.compatibility_flags)
      ? settings.compatibility_flags
      : [],
  };
}

function hasModuleSyntax(script) {
  return /\bexport\s+default\b/.test(script);
}

function currentCompatibilityDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildWorkerUploadForm(script, compatibilityDate) {
  const formData = new FormData();
  const isModule = hasModuleSyntax(script);
  const scriptPartName = isModule ? "worker.js" : "script";
  const metadata = isModule
    ? {
        main_module: scriptPartName,
        compatibility_date: compatibilityDate || currentCompatibilityDate(),
      }
    : { body_part: scriptPartName };

  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json"
  );
  formData.append(
    scriptPartName,
    new Blob([script], { type: "application/javascript" }),
    scriptPartName
  );

  return formData;
}

function normalizeZoneScopedHostname(value, zoneName, { allowPath = false } = {}) {
  const normalizedZoneName = String(zoneName || "").trim().toLowerCase();
  let input = String(value || "").trim();

  if (!normalizedZoneName) {
    throw new HttpError(400, "缺少域名区域名称");
  }

  input = input.replace(/^https?:\/\//i, "").split(/[?#]/)[0].replace(/^\/+/, "");

  if (!input) {
    throw new HttpError(400, allowPath ? "路由模式不能为空" : "自定义域不能为空");
  }

  let host = input;
  let path = "";
  const slashIndex = input.indexOf("/");

  if (slashIndex >= 0) {
    host = input.slice(0, slashIndex);
    path = input.slice(slashIndex);
  }

  host = host.trim().replace(/\.$/, "").toLowerCase();

  if (!host.includes(".")) {
    host = `${host}.${normalizedZoneName}`;
  }

  const hostForZoneCheck = host.startsWith("*.") ? host.slice(2) : host;

  if (hostForZoneCheck !== normalizedZoneName && !hostForZoneCheck.endsWith(`.${normalizedZoneName}`)) {
    throw new HttpError(400, `域名必须属于所选区域 ${normalizedZoneName}`);
  }

  if (!allowPath) {
    return host;
  }

  if (!path) {
    path = "/*";
  } else if (!path.startsWith("/")) {
    path = `/${path}`;
  } else if (path === "/") {
    path = "/*";
  }

  return `${host}${path}`;
}

export class WorkersService {
  constructor({ cloudflareClient, perPage = 50 }) {
    this.cloudflareClient = cloudflareClient;
    this.perPage = perPage;
  }

  async listAccounts() {
    const accounts = [];
    let page = 1;
    let totalPages = 1;

    do {
      const payload = await this.cloudflareClient.get("accounts", {
        page,
        per_page: this.perPage,
        direction: "asc",
      });

      if (!Array.isArray(payload.result)) {
        throw new HttpError(502, "Cloudflare 账号列表返回格式异常，请稍后重试。");
      }

      accounts.push(...payload.result.map(normalizeAccount));

      const reportedTotalPages = Number(payload.result_info?.total_pages);
      totalPages =
        Number.isFinite(reportedTotalPages) && reportedTotalPages >= page
          ? reportedTotalPages
          : page;
      page += 1;
    } while (page <= totalPages);

    return accounts;
  }

  async resolveAccountId(accountId = "") {
    const requestedAccountId = String(accountId || "").trim();
    const accounts = await this.listAccounts();

    if (requestedAccountId) {
      assertCloudflareId(requestedAccountId, "账号 ID");

      if (!accounts.some((account) => account.id === requestedAccountId)) {
        throw new HttpError(404, "当前凭据无权访问该 Cloudflare 账号");
      }

      return { accountId: requestedAccountId, accounts };
    }

    if (!accounts[0]?.id) {
      throw new HttpError(404, "当前账号下没有可用 Cloudflare Account");
    }

    return { accountId: accounts[0].id, accounts };
  }

  async listWorkers(accountId = "") {
    const warnings = [];
    const resolved = await this.resolveAccountId(accountId);
    const payload = await this.cloudflareClient.get(
      `accounts/${resolved.accountId}/workers/scripts`
    );

    if (!Array.isArray(payload.result)) {
      throw new HttpError(502, "Cloudflare Workers 列表返回格式异常，请稍后重试。");
    }

    const domains = await this.listDomains(resolved.accountId).catch((error) => {
      warnings.push(error.message);
      return [];
    });

    return {
      accounts: resolved.accounts,
      accountId: resolved.accountId,
      workers: payload.result.map(normalizeWorker),
      domains,
      warnings,
    };
  }

  async getWorker(scriptName, accountId = "") {
    const workerName = assertWorkerName(scriptName);
    const warnings = [];
    const resolved = await this.resolveAccountId(accountId);
    const [script, subdomain, settings, domains] = await Promise.all([
      this.cloudflareClient.getText(
        `accounts/${resolved.accountId}/workers/scripts/${workerName}`
      ),
      this.getSubdomainStatus(resolved.accountId, workerName).catch((error) => {
        warnings.push(error.message);
        return null;
      }),
      this.getSettings(resolved.accountId, workerName).catch((error) => {
        warnings.push(error.message);
        return null;
      }),
      this.listDomains(resolved.accountId, { service: workerName }).catch((error) => {
        warnings.push(error.message);
        return [];
      }),
    ]);

    return {
      accountId: resolved.accountId,
      accounts: resolved.accounts,
      worker: { id: workerName, name: workerName },
      script,
      subdomain,
      settings,
      domains,
      warnings,
    };
  }

  async uploadWorker(accountId, scriptName, input = {}) {
    const resolved = await this.resolveAccountId(accountId);
    const workerName = assertWorkerName(scriptName);
    const script = assertScriptContent(input.script ?? defaultWorkerScript);
    const formData = buildWorkerUploadForm(script, input.compatibilityDate);
    const payload = await this.cloudflareClient.putMultipart(
      `accounts/${resolved.accountId}/workers/scripts/${workerName}`,
      formData
    );

    return {
      accountId: resolved.accountId,
      worker: normalizeWorker(payload.result || { id: workerName }),
    };
  }

  async deleteWorker(accountId, scriptName) {
    const resolved = await this.resolveAccountId(accountId);
    const workerName = assertWorkerName(scriptName);

    await this.cloudflareClient.deleteAny(
      `accounts/${resolved.accountId}/workers/scripts/${workerName}`
    );

    return { accountId: resolved.accountId, id: workerName };
  }

  async getSettings(accountId, scriptName) {
    assertCloudflareId(accountId, "账号 ID");
    const workerName = assertWorkerName(scriptName);
    const payload = await this.cloudflareClient.get(
      `accounts/${accountId}/workers/scripts/${workerName}/settings`
    );

    return normalizeSettings(payload.result || {});
  }

  async getSubdomainStatus(accountId, scriptName) {
    assertCloudflareId(accountId, "账号 ID");
    const workerName = assertWorkerName(scriptName);
    const payload = await this.cloudflareClient.get(
      `accounts/${accountId}/workers/scripts/${workerName}/subdomain`
    );

    return normalizeSubdomainStatus(payload.result || {});
  }

  async updateSubdomain(accountId, scriptName, input = {}) {
    const resolved = await this.resolveAccountId(accountId);
    const workerName = assertWorkerName(scriptName);
    const enabled = Boolean(input.enabled);
    const body = {
      enabled,
      previews_enabled:
        input.previewsEnabled === undefined ? enabled : Boolean(input.previewsEnabled),
    };
    const payload = await this.cloudflareClient.post(
      `accounts/${resolved.accountId}/workers/scripts/${workerName}/subdomain`,
      body
    );

    return {
      accountId: resolved.accountId,
      subdomain: normalizeSubdomainStatus(payload.result || body),
    };
  }

  async listRoutes(zoneId, scriptName = "") {
    assertCloudflareId(zoneId, "区域 ID");
    const workerName = scriptName ? assertWorkerName(scriptName) : "";
    const payload = await this.cloudflareClient.get(`zones/${zoneId}/workers/routes`);

    if (!Array.isArray(payload.result)) {
      throw new HttpError(502, "Cloudflare Worker 路由返回格式异常，请稍后重试。");
    }

    return payload.result
      .map(normalizeRoute)
      .filter((route) => !workerName || route.script === workerName)
      .sort((left, right) => left.pattern.localeCompare(right.pattern));
  }

  async getZoneName(zoneId, fallbackZoneName = "") {
    const zoneName = String(fallbackZoneName || "").trim().toLowerCase();

    if (zoneName) {
      return zoneName;
    }

    const payload = await this.cloudflareClient.get(`zones/${zoneId}`);
    const fetchedZoneName = String(payload.result?.name || "").trim().toLowerCase();

    if (!fetchedZoneName) {
      throw new HttpError(502, "Cloudflare 区域返回格式异常，请稍后重试。");
    }

    return fetchedZoneName;
  }

  async createRoute(zoneId, input = {}) {
    assertCloudflareId(zoneId, "区域 ID");
    const workerName = assertWorkerName(input.scriptName);
    const zoneName = await this.getZoneName(zoneId, input.zoneName);
    const pattern = normalizeZoneScopedHostname(input.pattern, zoneName, {
      allowPath: true,
    });
    const payload = await this.cloudflareClient.post(`zones/${zoneId}/workers/routes`, {
      pattern,
      script: workerName,
    });

    return normalizeRoute(payload.result || {});
  }

  async deleteRoute(zoneId, routeId) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareResourceId(routeId, "Worker 路由 ID");

    await this.cloudflareClient.delete(`zones/${zoneId}/workers/routes/${routeId}`);

    return { id: routeId };
  }

  async listDomains(accountId, filters = {}) {
    assertCloudflareId(accountId, "账号 ID");
    const payload = await this.cloudflareClient.get(
      `accounts/${accountId}/workers/domains`,
      filters
    );

    if (!Array.isArray(payload.result)) {
      throw new HttpError(502, "Cloudflare Worker 自定义域返回格式异常，请稍后重试。");
    }

    return payload.result.map(normalizeDomain).sort((left, right) => {
      return left.hostname.localeCompare(right.hostname);
    });
  }

  async createDomain(accountId, input = {}) {
    const resolved = await this.resolveAccountId(accountId);
    const workerName = assertWorkerName(input.scriptName);
    const zoneId = String(input.zoneId || "").trim();
    assertCloudflareId(zoneId, "区域 ID");
    const zoneName = await this.getZoneName(zoneId, input.zoneName);
    const hostname = normalizeZoneScopedHostname(input.hostname, zoneName);
    const payload = await this.cloudflareClient.put(
      `accounts/${resolved.accountId}/workers/domains`,
      {
        hostname,
        service: workerName,
        environment: "production",
        zone_id: zoneId,
        zone_name: zoneName,
      }
    );

    return normalizeDomain(payload.result || {});
  }

  async deleteDomain(accountId, domainId) {
    const resolved = await this.resolveAccountId(accountId);
    assertCloudflareResourceId(domainId, "Worker 自定义域 ID");

    await this.cloudflareClient.delete(
      `accounts/${resolved.accountId}/workers/domains/${domainId}`
    );

    return { accountId: resolved.accountId, id: domainId };
  }
}
