import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId } from "./cloudflare-id.js";

const settingDefinitions = [
  {
    id: "ssl",
    key: "ssl",
    label: "SSL 加密模式",
    fallback: "flexible",
    values: new Set(["off", "flexible", "full", "strict", "origin_pull"]),
  },
  {
    id: "always_use_https",
    key: "alwaysUseHttps",
    label: "始终使用 HTTPS",
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
    id: "automatic_https_rewrites",
    key: "automaticHttpsRewrites",
    label: "自动 HTTPS 重写",
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
    id: "min_tls_version",
    key: "minTlsVersion",
    label: "最低 TLS 版本",
    fallback: "1.2",
    values: new Set(["1.0", "1.1", "1.2", "1.3"]),
  },
  {
    id: "tls_1_3",
    key: "tls13",
    label: "TLS 1.3",
    fallback: true,
    values: new Set(["on", "off", "zrt"]),
    toApi(value) {
      return value === "zrt" ? "zrt" : value ? "on" : "off";
    },
    fromApi(value) {
      return value === "on" || value === "zrt";
    },
  },
  {
    id: "opportunistic_encryption",
    key: "opportunisticEncryption",
    label: "机会性加密",
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
    id: "websockets",
    key: "websockets",
    label: "WebSockets",
    fallback: true,
    values: new Set(["on", "off"]),
    toApi(value) {
      return value ? "on" : "off";
    },
    fromApi(value) {
      return value === "on";
    },
  },
  {
    id: "http3",
    key: "http3",
    label: "HTTP/3",
    fallback: true,
    values: new Set(["on", "off"]),
    toApi(value) {
      return value ? "on" : "off";
    },
    fromApi(value) {
      return value === "on";
    },
  },
];

const settingsByKey = new Map(settingDefinitions.map((definition) => [definition.key, definition]));

function normalizeSetting(setting = {}, definition) {
  const apiValue = setting.value ?? definition.fallback;

  return {
    id: definition.id,
    key: definition.key,
    label: definition.label,
    value: definition.fromApi ? definition.fromApi(apiValue) : apiValue,
    apiValue,
    editable: setting.editable !== false,
    modifiedOn: setting.modified_on || null,
  };
}

function fallbackSetting(definition) {
  return {
    id: definition.id,
    key: definition.key,
    label: definition.label,
    value: definition.fallback,
    apiValue: definition.toApi ? definition.toApi(definition.fallback) : definition.fallback,
    editable: false,
    modifiedOn: null,
  };
}

function normalizeUpdateInput(input = {}) {
  const updates = [];

  for (const [key, value] of Object.entries(input)) {
    const definition = settingsByKey.get(key);

    if (!definition) {
      continue;
    }

    const apiValue = definition.toApi ? definition.toApi(value) : String(value || "").trim();

    if (!definition.values.has(apiValue)) {
      throw new HttpError(400, `${definition.label}设置值无效`);
    }

    updates.push({ definition, value: apiValue });
  }

  if (updates.length === 0) {
    throw new HttpError(400, "没有可保存的 SSL/TLS 设置");
  }

  return updates;
}

export class SslSettingsService {
  constructor({ cloudflareClient }) {
    this.cloudflareClient = cloudflareClient;
  }

  async getSettings(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");

    const results = await Promise.allSettled(
      settingDefinitions.map((definition) =>
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
      const definition = settingDefinitions[index];

      if (result.status === "fulfilled") {
        settings[definition.key] = normalizeSetting(result.value.result, definition);
        return;
      }

      warnings.push(`${definition.label}: ${result.reason.message}`);
      settings[definition.key] = fallbackSetting(definition);
    });

    return { settings, warnings };
  }

  async updateSettings(zoneId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    const updates = normalizeUpdateInput(input);

    await Promise.all(
      updates.map(({ definition, value }) =>
        this.cloudflareClient.patch(`zones/${zoneId}/settings/${definition.id}`, { value })
      )
    );

    return this.getSettings(zoneId);
  }
}
