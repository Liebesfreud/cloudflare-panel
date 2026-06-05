import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId } from "./cloudflare-id.js";

const cacheSettingDefinitions = [
  {
    id: "cache_level",
    key: "cacheLevel",
    fallback: "aggressive",
    values: new Set(["basic", "simplified", "aggressive"]),
  },
  {
    id: "browser_cache_ttl",
    key: "browserCacheTtl",
    fallback: 14400,
    values: new Set([0, 1800, 3600, 7200, 14400, 28800, 43200, 86400, 604800, 2678400]),
  },
  {
    id: "development_mode",
    key: "developmentMode",
    fallback: false,
    values: new Set(["on", "off"]),
    toApi(value) {
      return value ? "on" : "off";
    },
    fromApi(value) {
      return value === "on";
    },
  },
  {
    id: "always_online",
    key: "alwaysOnline",
    fallback: false,
    values: new Set(["on", "off"]),
    toApi(value) {
      return value ? "on" : "off";
    },
    fromApi(value) {
      return value === "on";
    },
  },
];

const cacheSettingsByKey = new Map(
  cacheSettingDefinitions.map((definition) => [definition.key, definition])
);

function normalizeSetting(setting, definition) {
  const value = setting?.value ?? definition.fallback;

  return {
    id: definition.id,
    key: definition.key,
    value: definition.fromApi ? definition.fromApi(value) : value,
    editable: setting?.editable !== false,
    modifiedOn: setting?.modified_on || null,
  };
}

function fallbackSetting(definition) {
  return {
    id: definition.id,
    key: definition.key,
    value: definition.fallback,
    editable: false,
    modifiedOn: null,
  };
}

function normalizeCacheInput(input = {}) {
  const updates = [];

  for (const [key, value] of Object.entries(input)) {
    const definition = cacheSettingsByKey.get(key);

    if (!definition) {
      continue;
    }

    const apiValue = definition.toApi ? definition.toApi(Boolean(value)) : value;

    if (!definition.values.has(apiValue)) {
      throw new HttpError(400, `${key} 设置值无效`);
    }

    updates.push({ definition, value: apiValue });
  }

  if (updates.length === 0) {
    throw new HttpError(400, "没有可保存的缓存设置");
  }

  return updates;
}

function normalizePurgeBody(input = {}) {
  const mode = String(input.mode || "").trim();

  if (mode === "everything") {
    return { purge_everything: true };
  }

  if (mode !== "url") {
    throw new HttpError(400, "清除缓存方式无效");
  }

  const rawUrls = Array.isArray(input.urls) ? input.urls : [input.url];
  const urls = rawUrls
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (urls.length === 0) {
    throw new HttpError(400, "请输入要清除缓存的 URL");
  }

  if (urls.length > 30) {
    throw new HttpError(400, "单次最多清除 30 个 URL");
  }

  for (const value of urls) {
    let parsedUrl;

    try {
      parsedUrl = new URL(value);
    } catch {
      throw new HttpError(400, "URL 格式无效");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new HttpError(400, "URL 必须以 http:// 或 https:// 开头");
    }
  }

  return { files: urls };
}

export class CacheSettingsService {
  constructor({ cloudflareClient }) {
    this.cloudflareClient = cloudflareClient;
  }

  async getSettings(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");

    const results = await Promise.allSettled(
      cacheSettingDefinitions.map((definition) =>
        this.cloudflareClient.get(`zones/${zoneId}/settings/${definition.id}`)
      )
    );

    const rejectedResults = results.filter((result) => result.status === "rejected");

    if (rejectedResults.length === results.length) {
      throw rejectedResults[0].reason;
    }

    const warnings = [];
    const settings = {};

    results.forEach((result, index) => {
      const definition = cacheSettingDefinitions[index];

      if (result.status === "fulfilled") {
        settings[definition.key] = normalizeSetting(result.value.result, definition);
        return;
      }

      warnings.push(`${definition.id}: ${result.reason.message}`);
      settings[definition.key] = fallbackSetting(definition);
    });

    return { settings, warnings };
  }

  async updateSettings(zoneId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    const updates = normalizeCacheInput(input);

    await Promise.all(
      updates.map(({ definition, value }) =>
        this.cloudflareClient.patch(`zones/${zoneId}/settings/${definition.id}`, { value })
      )
    );

    return this.getSettings(zoneId);
  }

  async purgeCache(zoneId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    const purgeBody = normalizePurgeBody(input);
    const payload = await this.cloudflareClient.post(`zones/${zoneId}/purge_cache`, purgeBody);

    return {
      id: payload.result?.id || zoneId,
      mode: purgeBody.purge_everything ? "everything" : "url",
    };
  }
}
