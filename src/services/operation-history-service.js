const mutatingMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const defaultMaxEntries = 300;

const moduleMatchers = [
  [/^\/api\/zones\/[^/]+\/dns-records/i, "DNS 记录"],
  [/^\/api\/zones\/[^/]+\/ssl-settings/i, "SSL\/TLS"],
  [/^\/api\/zones\/[^/]+\/cache-settings|^\/api\/zones\/[^/]+\/purge-cache/i, "缓存管理"],
  [/^\/api\/zones\/[^/]+\/firewall-rules|^\/api\/zones\/[^/]+\/firewall-rulesets/i, "防火墙"],
  [/^\/api\/zones\/[^/]+\/page-rules/i, "页面规则"],
  [/^\/api\/zones\/[^/]+\/certificates|^\/api\/zones\/[^/]+\/origin-certificates/i, "证书管理"],
  [/^\/api\/zones\/[^/]+\/speed-deploy/i, "一键加速"],
  [/^\/api\/zones\/[^/]+\/automation/i, "自动优化"],
  [/^\/api\/workers/i, "Workers"],
  [/^\/api\/developer-resources\/pages/i, "Pages"],
  [/^\/api\/developer-resources\/d1/i, "D1 数据库"],
  [/^\/api\/developer-resources\/r2/i, "R2 存储桶"],
  [/^\/api\/developer-resources\/kv/i, "Workers KV"],
  [/^\/api\/developer-resources\/tunnels/i, "Cloudflare Tunnels"],
  [/^\/api\/session\//i, "账号连接"],
];

const actionLabels = {
  POST: "创建",
  PATCH: "更新",
  PUT: "保存",
  DELETE: "删除",
};

function normalizeLimit(value, fallback = 80) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit)) {
    return fallback;
  }

  return Math.min(Math.max(limit, 1), defaultMaxEntries);
}

function labelModule(pathname) {
  return moduleMatchers.find(([pattern]) => pattern.test(pathname))?.[1] || "Cloudflare API";
}

function resourceFromParams(params = {}) {
  return (
    params.accessDomain ||
    params.scriptName ||
    params.resourceId ||
    params.recordId ||
    params.ruleId ||
    params.certificateId ||
    params.zoneId ||
    ""
  );
}

function compactPath(pathname) {
  return pathname.replace(/^\/api\//, "");
}

function normalizeEntry(entry = {}) {
  const method = String(entry.method || "").toUpperCase();
  const pathname = String(entry.pathname || "");
  const module = entry.module || labelModule(pathname);
  const resource = String(entry.resource || resourceFromParams(entry.params) || "");
  const status = entry.status === "failed" ? "failed" : "success";
  const createdAt = entry.createdAt || new Date().toISOString();

  return {
    id: entry.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action: entry.action || actionLabels[method] || "操作",
    durationMs: Math.max(0, Number(entry.durationMs) || 0),
    error: status === "failed" ? String(entry.error || "操作失败") : "",
    method,
    module,
    path: compactPath(pathname),
    resource,
    status,
    statusCode: Number(entry.statusCode) || (status === "failed" ? 500 : 200),
    createdAt,
  };
}

export class OperationHistoryService {
  constructor({ maxEntries = defaultMaxEntries } = {}) {
    this.maxEntries = normalizeLimit(maxEntries, defaultMaxEntries);
    this.entries = [];
  }

  shouldRecord(method, pathname) {
    return (
      mutatingMethods.has(String(method || "").toUpperCase()) &&
      pathname.startsWith("/api/") &&
      !pathname.startsWith("/api/operation-history")
    );
  }

  record(entry) {
    const normalized = normalizeEntry(entry);
    this.entries.unshift(normalized);

    if (this.entries.length > this.maxEntries) {
      this.entries.length = this.maxEntries;
    }

    return normalized;
  }

  list({ module = "", status = "", limit = 80 } = {}) {
    const normalizedModule = String(module || "").trim();
    const normalizedStatus = String(status || "").trim();
    const normalizedLimit = normalizeLimit(limit);
    let entries = this.entries;

    if (normalizedModule) {
      entries = entries.filter((entry) => entry.module === normalizedModule);
    }

    if (normalizedStatus) {
      entries = entries.filter((entry) => entry.status === normalizedStatus);
    }

    return {
      entries: entries.slice(0, normalizedLimit),
      filters: {
        modules: [...new Set(this.entries.map((entry) => entry.module))].sort((left, right) =>
          left.localeCompare(right)
        ),
        statuses: ["success", "failed"],
      },
      total: this.entries.length,
    };
  }

  clear() {
    const deleted = this.entries.length;
    this.entries = [];

    return { deleted };
  }
}
