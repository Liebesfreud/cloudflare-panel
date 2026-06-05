import { randomBytes } from "node:crypto";
import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId, assertCloudflareResourceId } from "./cloudflare-id.js";

const resourceTypes = new Set(["pages", "d1", "r2", "kv", "tunnels"]);
const resourceNamePattern = /^[a-z0-9][a-z0-9._-]{0,62}$/i;
const r2BucketNamePattern = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

function assertResourceType(type) {
  const normalizedType = String(type || "").trim().toLowerCase();

  if (!resourceTypes.has(normalizedType)) {
    throw new HttpError(404, "资源模块不存在");
  }

  return normalizedType;
}

function assertResourceName(value, label, { r2 = false } = {}) {
  const name = String(value || "").trim();
  const pattern = r2 ? r2BucketNamePattern : resourceNamePattern;

  if (!pattern.test(name)) {
    throw new HttpError(
      400,
      r2
        ? `${label} 只能包含小写字母、数字和连字符，长度 3-63`
        : `${label} 只能包含字母、数字、点、下划线和连字符，长度 1-63`
    );
  }

  return r2 ? name.toLowerCase() : name;
}

function normalizeAccount(account = {}) {
  return {
    id: account.id || "",
    name: account.name || account.id || "Cloudflare Account",
    type: account.type || "",
  };
}

function listFromPayload(payload, nestedKeys = []) {
  if (Array.isArray(payload.result)) {
    return payload.result;
  }

  for (const key of nestedKeys) {
    if (Array.isArray(payload.result?.[key])) {
      return payload.result[key];
    }
  }

  return null;
}

function normalizePagesProject(project = {}) {
  const deployment = project.latest_deployment || project.canonical_deployment || {};

  return {
    id: project.name || project.id || "",
    name: project.name || project.id || "",
    badge: project.production_branch || "main",
    createdOn: project.created_on || "",
    modifiedOn: deployment.modified_on || deployment.created_on || "",
    status: deployment.latest_stage?.status || deployment.stage || project.status || "",
    description: project.subdomain || `${project.name || "project"}.pages.dev`,
    meta: [
      ["生产分支", project.production_branch || "-"],
      ["部署", deployment.id || "-"],
      ["域名", Array.isArray(project.domains) ? project.domains.length : 0],
    ],
  };
}

function normalizeD1Database(database = {}) {
  return {
    id: database.uuid || database.id || "",
    name: database.name || database.uuid || database.id || "",
    badge: database.version || "D1",
    createdOn: database.created_at || database.created_on || "",
    modifiedOn: database.modified_at || database.modified_on || "",
    status: database.running_in_region || database.primary_location_hint || "",
    description: database.uuid || database.id || "Cloudflare D1 Database",
    meta: [
      ["UUID", database.uuid || database.id || "-"],
      ["表数量", database.num_tables ?? "-"],
      ["大小", database.file_size ? `${database.file_size} B` : "-"],
    ],
  };
}

function normalizeR2Bucket(bucket = {}) {
  return {
    id: bucket.name || "",
    name: bucket.name || "",
    badge: bucket.location || bucket.jurisdiction || "R2",
    createdOn: bucket.creation_date || bucket.created_at || "",
    modifiedOn: bucket.modified_at || "",
    status: bucket.storage_class || bucket.location || "",
    description: bucket.name ? `${bucket.name} bucket` : "Cloudflare R2 Bucket",
    meta: [
      ["位置", bucket.location || bucket.jurisdiction || "Auto"],
      ["创建时间", bucket.creation_date || bucket.created_at || "-"],
      ["对象", bucket.object_count ?? "-"],
    ],
  };
}

function normalizeKvNamespace(namespace = {}) {
  return {
    id: namespace.id || "",
    name: namespace.title || namespace.id || "",
    badge: "KV",
    createdOn: namespace.created_on || namespace.created_at || "",
    modifiedOn: namespace.modified_on || "",
    status: namespace.supports_url_encoding ? "URL Encoding" : "",
    description: namespace.id || "Workers KV Namespace",
    meta: [
      ["Namespace ID", namespace.id || "-"],
      ["标题", namespace.title || "-"],
      ["URL Encoding", namespace.supports_url_encoding ? "支持" : "默认"],
    ],
  };
}

function normalizeTunnel(tunnel = {}) {
  const activeConnections = Array.isArray(tunnel.connections)
    ? tunnel.connections.filter((connection) => !connection.is_pending_reconnect).length
    : 0;

  return {
    id: tunnel.id || "",
    name: tunnel.name || tunnel.id || "",
    badge: tunnel.config_src || "cloudflared",
    createdOn: tunnel.created_at || tunnel.created_on || "",
    modifiedOn: tunnel.conns_active_at || "",
    status: tunnel.status || (activeConnections ? "active" : "inactive"),
    description: tunnel.id || "Cloudflare Tunnel",
    meta: [
      ["Tunnel ID", tunnel.id || "-"],
      ["连接器", activeConnections],
      ["配置源", tunnel.config_src || "cloudflared"],
    ],
  };
}

const definitions = {
  pages: {
    listPath: (accountId) => `accounts/${accountId}/pages/projects`,
    createPath: (accountId) => `accounts/${accountId}/pages/projects`,
    deletePath: (accountId, projectName) =>
      `accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`,
    perPage: 10,
    normalize: normalizePagesProject,
    listKeys: [],
    createBody(input) {
      const name = assertResourceName(input.name, "Pages 项目名称");
      return {
        name,
        production_branch: String(input.productionBranch || "main").trim() || "main",
      };
    },
    normalizeId(id) {
      return assertResourceName(id, "Pages 项目名称");
    },
    createMethod: "post",
  },
  d1: {
    listPath: (accountId) => `accounts/${accountId}/d1/database`,
    createPath: (accountId) => `accounts/${accountId}/d1/database`,
    deletePath: (accountId, databaseId) => `accounts/${accountId}/d1/database/${databaseId}`,
    normalize: normalizeD1Database,
    listKeys: ["databases"],
    createBody(input) {
      return { name: assertResourceName(input.name, "D1 数据库名称") };
    },
    normalizeId(id) {
      assertCloudflareResourceId(id, "D1 数据库 ID");
      return id;
    },
    createMethod: "post",
  },
  r2: {
    listPath: (accountId) => `accounts/${accountId}/r2/buckets`,
    createPath: (accountId) => `accounts/${accountId}/r2/buckets`,
    deletePath: (accountId, bucketName) =>
      `accounts/${accountId}/r2/buckets/${assertResourceName(bucketName, "R2 存储桶名称", {
        r2: true,
      })}`,
    normalize: normalizeR2Bucket,
    listKeys: ["buckets"],
    createBody(input) {
      return {
        name: assertResourceName(input.name, "R2 存储桶名称", { r2: true }),
        jurisdiction: input.jurisdiction === "eu" || input.jurisdiction === "fedramp"
          ? input.jurisdiction
          : "default",
      };
    },
    normalizeId(id) {
      return assertResourceName(id, "R2 存储桶名称", { r2: true });
    },
    createMethod: "post",
  },
  kv: {
    listPath: (accountId) => `accounts/${accountId}/storage/kv/namespaces`,
    createPath: (accountId) => `accounts/${accountId}/storage/kv/namespaces`,
    deletePath: (accountId, namespaceId) =>
      `accounts/${accountId}/storage/kv/namespaces/${namespaceId}`,
    normalize: normalizeKvNamespace,
    listKeys: ["namespaces"],
    createBody(input) {
      return { title: assertResourceName(input.name, "KV 命名空间名称") };
    },
    normalizeId(id) {
      assertCloudflareResourceId(id, "KV 命名空间 ID");
      return id;
    },
    createMethod: "post",
  },
  tunnels: {
    listPath: (accountId) => `accounts/${accountId}/cfd_tunnel`,
    listQuery: { is_deleted: false },
    createPath: (accountId) => `accounts/${accountId}/cfd_tunnel`,
    deletePath: (accountId, tunnelId) => `accounts/${accountId}/cfd_tunnel/${tunnelId}`,
    normalize: normalizeTunnel,
    listKeys: ["tunnels"],
    createBody(input) {
      return {
        name: assertResourceName(input.name, "Tunnel 名称"),
        config_src: input.configSrc === "local" ? "local" : "cloudflare",
        tunnel_secret: input.tunnelSecret || randomBytes(32).toString("base64"),
      };
    },
    normalizeId(id) {
      assertCloudflareResourceId(id, "Tunnel ID");
      return id;
    },
    createMethod: "post",
  },
};

export class DeveloperResourcesService {
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

  async list(type, accountId = "") {
    const resourceType = assertResourceType(type);
    const definition = definitions[resourceType];
    const resolved = await this.resolveAccountId(accountId);
    const resources = await this.listResourceItems(definition, resolved.accountId);

    return {
      accounts: resolved.accounts,
      accountId: resolved.accountId,
      type: resourceType,
      items: resources.map(definition.normalize),
      warnings: [],
    };
  }

  async listResourceItems(definition, accountId) {
    const resources = [];
    let page = 1;
    let totalPages = 1;
    let cursor = "";

    do {
      const payload = await this.cloudflareClient.get(definition.listPath(accountId), {
        page,
        per_page: definition.perPage || this.perPage,
        ...(cursor ? { cursor } : {}),
        ...(definition.listQuery || {}),
      });
      const pageResources = listFromPayload(payload, definition.listKeys);

      if (!Array.isArray(pageResources)) {
        throw new HttpError(502, "Cloudflare 资源列表返回格式异常，请稍后重试。");
      }

      resources.push(...pageResources);

      const nextCursor =
        payload.result_info?.cursor ||
        payload.result?.cursor ||
        payload.result_info?.cursors?.after ||
        "";

      if (nextCursor && nextCursor !== cursor) {
        cursor = nextCursor;
        page += 1;
        totalPages = page;
        continue;
      }

      cursor = "";
      const reportedTotalPages = Number(payload.result_info?.total_pages);
      totalPages =
        Number.isFinite(reportedTotalPages) && reportedTotalPages >= page
          ? reportedTotalPages
          : page;
      page += 1;
    } while (cursor || page <= totalPages);

    return resources;
  }

  async create(type, accountId = "", input = {}) {
    const resourceType = assertResourceType(type);
    const definition = definitions[resourceType];
    const resolved = await this.resolveAccountId(accountId);
    const body = definition.createBody(input);
    const path =
      typeof definition.createPath === "function"
        ? definition.createPath(resolved.accountId, input)
        : definition.createPath;
    const payload = await this.cloudflareClient[definition.createMethod](path, body);
    const result = payload.result?.bucket || payload.result || { ...body, name: input.name };
    const normalized = definition.normalize(result);

    return {
      accountId: resolved.accountId,
      type: resourceType,
      item: normalized.id ? normalized : definition.normalize({ ...body, name: input.name }),
    };
  }

  async delete(type, accountId = "", resourceId = "") {
    const resourceType = assertResourceType(type);
    const definition = definitions[resourceType];
    const resolved = await this.resolveAccountId(accountId);
    const normalizedId = definition.normalizeId(decodeURIComponent(String(resourceId || "")));

    await this.cloudflareClient.deleteAny(
      definition.deletePath(resolved.accountId, normalizedId)
    );

    return { accountId: resolved.accountId, type: resourceType, id: normalizedId };
  }
}
