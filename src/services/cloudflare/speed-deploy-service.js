import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId } from "./cloudflare-id.js";

const fallbackOriginIp = "6.6.6.6";
const fallbackOriginLabel = "saas";
const fallbackOriginComment = "一键加速回退源";
const accessDomainComment = "一键加速优选域名";
const defaultTlsVersion = "1.2";
const sourceRecordTypes = new Set(["A", "AAAA", "CNAME"]);

function normalizeHostname(value, label) {
  const hostname = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.+$/g, "");

  if (!hostname) {
    throw new HttpError(400, `请输入${label}`);
  }

  if (hostname.length > 253) {
    throw new HttpError(400, `${label}长度不能超过 253 个字符`);
  }

  if (
    hostname.includes("://") ||
    hostname.includes("/") ||
    hostname.startsWith(".") ||
    !hostname.includes(".")
  ) {
    throw new HttpError(400, `${label}格式无效，请填写域名而不是 URL`);
  }

  const labels = hostname.split(".");
  const valid = labels.every(
    (item) =>
      item.length >= 1 &&
      item.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(item)
  );

  if (!valid) {
    throw new HttpError(400, `${label}格式无效`);
  }

  return hostname;
}

function normalizeCacheTtl(value) {
  const cacheTtl = Number(value ?? 0);

  if (!Number.isInteger(cacheTtl) || cacheTtl < 0) {
    throw new HttpError(400, "缓存时间必须是非负整数");
  }

  return cacheTtl;
}

function normalizeDeployInput(zoneId, input = {}) {
  assertCloudflareId(zoneId, "区域 ID");

  const zoneName = normalizeHostname(input.zoneName, "一级域名");
  const accessDomain = normalizeHostname(input.accessDomain, "访问域名");
  const targetDomain = normalizeHostname(input.targetDomain, "源站域名");
  const optimizedDomain = normalizeHostname(input.optimizedDomain, "优选域名");
  const cacheTtl = normalizeCacheTtl(input.cacheTtl);

  if (accessDomain !== zoneName && !accessDomain.endsWith(`.${zoneName}`)) {
    throw new HttpError(400, `访问域名必须属于 ${zoneName}`);
  }

  return {
    accessDomain,
    cacheTtl,
    optimizedDomain,
    targetDomain,
    zoneId,
    zoneName,
  };
}

function isManagedFallbackRecord(record, fallbackOriginName) {
  return (
    record.type === "A" &&
    record.name === fallbackOriginName &&
    record.content === fallbackOriginIp &&
    record.comment === fallbackOriginComment
  );
}

function isManagedAccessRecord(record, config) {
  return (
    record.type === "CNAME" &&
    record.name === config.accessDomain &&
    record.content === config.optimizedDomain &&
    record.comment === accessDomainComment
  );
}

function normalizeCustomHostname(hostname) {
  return {
    id: hostname.id,
    hostname: hostname.hostname,
    status: hostname.status || "",
    customOriginServer: hostname.custom_origin_server || "",
    sslStatus: hostname.ssl?.status || "",
    validationMethod: hostname.ssl?.method || "",
  };
}

function normalizeZoneName(zone = {}) {
  const name = String(zone.name || "").trim().toLowerCase();

  if (!name) {
    throw new HttpError(502, "Cloudflare 区域返回格式异常，请稍后重试。");
  }

  return name;
}

function speedDomainIdentity(value) {
  return normalizeHostname(value, "加速域名");
}

function customHostnameBody(config) {
  return {
    hostname: config.accessDomain,
    custom_origin_server: config.targetDomain,
    ssl: {
      method: "http",
      type: "dv",
      settings: {
        min_tls_version: defaultTlsVersion,
      },
    },
  };
}

function customHostnameUpdateBody(config) {
  const body = customHostnameBody(config);
  delete body.hostname;
  return body;
}

export class SpeedDeployService {
  constructor({ cloudflareClient, dnsRecordsService }) {
    this.cloudflareClient = cloudflareClient;
    this.dnsRecordsService = dnsRecordsService;
  }

  async deploy(zoneId, input) {
    const config = normalizeDeployInput(zoneId, input);
    const fallbackOriginName = `${fallbackOriginLabel}.${config.zoneName}`;
    const records = await this.dnsRecordsService.listRecords(config.zoneId);

    this.assertSourceDnsRecord(config, records);
    const accessRecord = await this.ensureAccessDnsRecord(config, records);
    const fallbackRecord = await this.ensureFallbackDnsRecord(
      config,
      fallbackOriginName,
      records
    );
    const sslSetting = await this.setFlexibleSsl(config);
    const fallbackOrigin = await this.setFallbackOrigin(config, fallbackOriginName);
    const customHostname = await this.ensureCustomHostname(config);

    return {
      accessRecord,
      accessDomain: config.accessDomain,
      cacheTtl: config.cacheTtl,
      customHostname,
      fallbackOrigin,
      fallbackRecord,
      optimizedDomain: config.optimizedDomain,
      sslSetting,
      targetDomain: config.targetDomain,
      zoneId: config.zoneId,
      zoneName: config.zoneName,
    };
  }

  async listManagedDomains(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");
    const [zonePayload, records, customHostnames] = await Promise.all([
      this.cloudflareClient.get(`zones/${zoneId}`),
      this.dnsRecordsService.listRecords(zoneId),
      this.listCustomHostnames(zoneId).catch(() => []),
    ]);
    const zoneName = normalizeZoneName(zonePayload.result || {});
    const managedAccessRecords = records.filter(
      (record) => record.type === "CNAME" && record.comment === accessDomainComment
    );
    const managedByName = new Map();

    for (const record of managedAccessRecords) {
      managedByName.set(record.name, {
        id: record.name,
        accessDomain: record.name,
        accessRecord: record,
        fallbackOrigin: `${fallbackOriginLabel}.${zoneName}`,
        optimizedDomain: record.content,
        targetDomain: "",
        cacheTtl: "0",
        status: "dns-ready",
        customHostname: null,
        createdAt: record.createdOn || record.modifiedOn || "",
      });
    }

    for (const hostname of customHostnames) {
      const normalized = normalizeCustomHostname(hostname);
      const existing = managedByName.get(normalized.hostname) || {
        id: normalized.hostname,
        accessDomain: normalized.hostname,
        accessRecord: null,
        fallbackOrigin: `${fallbackOriginLabel}.${zoneName}`,
        optimizedDomain: "",
        cacheTtl: "0",
        createdAt: "",
      };

      managedByName.set(normalized.hostname, {
        ...existing,
        customHostname: normalized,
        targetDomain: normalized.customOriginServer,
        status: normalized.status || existing.status || "unknown",
      });
    }

    return {
      zoneId,
      zoneName,
      domains: [...managedByName.values()].sort((left, right) =>
        left.accessDomain.localeCompare(right.accessDomain)
      ),
    };
  }

  async deleteManagedDomain(zoneId, accessDomain) {
    assertCloudflareId(zoneId, "区域 ID");
    const hostname = speedDomainIdentity(accessDomain);
    const [records, customHostname] = await Promise.all([
      this.dnsRecordsService.listRecords(zoneId),
      this.findCustomHostname(zoneId, hostname).catch(() => null),
    ]);
    const deleted = [];

    for (const record of records) {
      if (record.name !== hostname || record.comment !== accessDomainComment) {
        continue;
      }

      await this.dnsRecordsService.deleteRecord(zoneId, record.id);
      deleted.push({ type: "dns", id: record.id, name: record.name });
    }

    if (customHostname?.id) {
      await this.cloudflareClient.deleteAny(
        `zones/${zoneId}/custom_hostnames/${customHostname.id}`
      );
      deleted.push({ type: "custom_hostname", id: customHostname.id, name: hostname });
    }

    if (deleted.length === 0) {
      throw new HttpError(404, "未找到由面板管理的加速域名");
    }

    return { zoneId, accessDomain: hostname, deleted };
  }

  assertSourceDnsRecord(config, records) {
    const sourceBelongsToZone =
      config.targetDomain === config.zoneName ||
      config.targetDomain.endsWith(`.${config.zoneName}`);

    if (!sourceBelongsToZone) {
      return;
    }

    const hasSourceRecord = records.some(
      (record) =>
        record.name === config.targetDomain && sourceRecordTypes.has(record.type)
    );

    if (!hasSourceRecord) {
      throw new HttpError(
        409,
        `源站域名 ${config.targetDomain} 未添加 DNS 解析，请先添加 A、AAAA 或 CNAME 记录后再执行一键加速`
      );
    }
  }

  async ensureAccessDnsRecord(config, records) {
    const existingRecords = records.filter(
      (record) => record.name === config.accessDomain
    );

    if (existingRecords.length > 1) {
      throw new HttpError(
        409,
        `${config.accessDomain} 存在多条解析，请先清理后再执行一键加速`
      );
    }

    const recordBody = {
      type: "CNAME",
      name: config.accessDomain,
      content: config.optimizedDomain,
      ttl: 1,
      proxied: false,
      comment: accessDomainComment,
    };

    if (existingRecords.length === 1) {
      const [record] = existingRecords;

      if (isManagedAccessRecord(record, config) && record.proxied === false) {
        return record;
      }

      return this.dnsRecordsService.updateRecord(
        config.zoneId,
        record.id,
        recordBody
      );
    }

    return this.dnsRecordsService.createRecord(config.zoneId, recordBody);
  }

  async ensureFallbackDnsRecord(config, fallbackOriginName, records) {
    const existingRecords = records.filter((record) => record.name === fallbackOriginName);
    const blockingRecords = existingRecords.filter(
      (record) => record.type !== "A" || record.content !== fallbackOriginIp
    );

    if (blockingRecords.length > 0) {
      throw new HttpError(
        409,
        `${fallbackOriginName} 已存在其它解析，请先处理后再执行一键加速`
      );
    }

    const matchingRecords = existingRecords.filter((record) => record.type === "A");

    if (matchingRecords.length > 1) {
      throw new HttpError(
        409,
        `${fallbackOriginName} 存在多条 A 记录，请保留一条后再执行一键加速`
      );
    }

    if (matchingRecords.length === 1) {
      const [record] = matchingRecords;

      if (isManagedFallbackRecord(record, fallbackOriginName) && record.proxied) {
        return record;
      }

      const updatedRecord = await this.dnsRecordsService.updateRecord(config.zoneId, record.id, {
        type: "A",
        name: fallbackOriginName,
        content: fallbackOriginIp,
        ttl: 1,
        proxied: true,
        comment: fallbackOriginComment,
      });

      return updatedRecord;
    }

    return this.dnsRecordsService.createRecord(config.zoneId, {
      type: "A",
      name: fallbackOriginName,
      content: fallbackOriginIp,
      ttl: 1,
      proxied: true,
      comment: fallbackOriginComment,
    });
  }

  async setFlexibleSsl(config) {
    const payload = await this.cloudflareClient.patch(
      `zones/${config.zoneId}/settings/ssl`,
      {
        value: "flexible",
      }
    );

    return {
      id: payload.result?.id || "ssl",
      value: payload.result?.value || "flexible",
      editable: payload.result?.editable !== false,
    };
  }

  async setFallbackOrigin(config, fallbackOriginName) {
    const payload = await this.cloudflareClient.put(
      `zones/${config.zoneId}/custom_hostnames/fallback_origin`,
      {
        origin: fallbackOriginName,
      }
    );

    return {
      origin: payload.result?.origin || fallbackOriginName,
      status: payload.result?.status || "configured",
    };
  }

  async ensureCustomHostname(config) {
    const existingHostname = await this.findCustomHostname(
      config.zoneId,
      config.accessDomain
    );
    const body = customHostnameBody(config);

    if (existingHostname?.id) {
      const payload = await this.cloudflareClient.patch(
        `zones/${config.zoneId}/custom_hostnames/${existingHostname.id}`,
        customHostnameUpdateBody(config)
      );

      return normalizeCustomHostname(payload.result || existingHostname);
    }

    const payload = await this.cloudflareClient.post(
      `zones/${config.zoneId}/custom_hostnames`,
      body
    );

    return normalizeCustomHostname(payload.result || body);
  }

  async findCustomHostname(zoneId, hostname) {
    const payload = await this.cloudflareClient.get(`zones/${zoneId}/custom_hostnames`, {
      hostname,
      page: 1,
      per_page: 50,
    });

    if (!Array.isArray(payload.result)) {
      throw new HttpError(502, "Cloudflare API 返回自定义主机名格式异常");
    }

    return payload.result.find((item) => item.hostname === hostname) || null;
  }

  async listCustomHostnames(zoneId) {
    const hostnames = [];
    let page = 1;
    let totalPages = 1;

    do {
      const payload = await this.cloudflareClient.get(`zones/${zoneId}/custom_hostnames`, {
        page,
        per_page: 50,
      });

      if (!Array.isArray(payload.result)) {
        throw new HttpError(502, "Cloudflare API 返回自定义主机名格式异常");
      }

      hostnames.push(...payload.result);

      const pageCount = Number(payload.result_info?.total_pages);
      const totalCount = Number(payload.result_info?.total_count);
      totalPages = Number.isFinite(pageCount)
        ? Math.max(1, pageCount)
        : Number.isFinite(totalCount)
          ? Math.max(1, Math.ceil(totalCount / 50))
          : page;
      page += 1;
    } while (page <= totalPages);

    return hostnames;
  }
}

export const speedDeployConstants = {
  accessDomainComment,
  defaultTlsVersion,
  fallbackOriginComment,
  fallbackOriginIp,
  fallbackOriginLabel,
};
