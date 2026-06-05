export const automationSettingDefinitions = [
  {
    id: "security_level",
    key: "securityLevel",
    fallback: "medium",
    values: new Set(["off", "essentially_off", "low", "medium", "high", "under_attack"]),
  },
  {
    id: "ssl",
    key: "ssl",
    fallback: "flexible",
    values: new Set(["off", "flexible", "full", "strict"]),
  },
  {
    id: "always_use_https",
    key: "alwaysUseHttps",
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
    id: "tls_1_3",
    key: "tls13",
    fallback: false,
    values: new Set(["on", "off", "zrt"]),
    toApi(value) {
      return value ? "on" : "off";
    },
    fromApi(value) {
      return value === "on" || value === "zrt";
    },
  },
  {
    id: "min_tls_version",
    key: "minTlsVersion",
    fallback: "1.2",
    values: new Set(["1.0", "1.1", "1.2", "1.3"]),
  },
  {
    id: "opportunistic_encryption",
    key: "opportunisticEncryption",
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
    id: "challenge_ttl",
    key: "challengeTtl",
    fallback: 1800,
    values: new Set([300, 900, 1800, 3600, 7200]),
    toApi(value) {
      return Number(value);
    },
  },
  {
    id: "browser_check",
    key: "browserCheck",
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
    id: "hotlink_protection",
    key: "hotlinkProtection",
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
    id: "email_obfuscation",
    key: "emailObfuscation",
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
    id: "ipv6",
    key: "ipv6",
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
    id: "cache_level",
    key: "cacheLevel",
    fallback: "aggressive",
    values: new Set(["basic", "simplified", "aggressive"]),
  },
  {
    id: "browser_cache_ttl",
    key: "browserCacheTtl",
    fallback: 7200,
    values: new Set([1800, 3600, 7200, 14400, 86400, 31_536_000]),
    toApi(value) {
      return Number(value);
    },
  },
  {
    id: "minify",
    key: "minify",
    fallback: { html: true, css: true, js: true },
    toApi(value) {
      return {
        html: value?.html ? "on" : "off",
        css: value?.css ? "on" : "off",
        js: value?.js ? "on" : "off",
      };
    },
    fromApi(value = {}) {
      return {
        html: value.html !== "off",
        css: value.css !== "off",
        js: value.js !== "off",
      };
    },
    validate(value) {
      return (
        value &&
        typeof value === "object" &&
        ["html", "css", "js"].every((key) => typeof value[key] === "boolean")
      );
    },
  },
  {
    id: "polish",
    key: "polish",
    fallback: "off",
    values: new Set(["off", "lossy", "lossless"]),
  },
  {
    id: "brotli",
    key: "brotli",
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
    id: "early_hints",
    key: "earlyHints",
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
    id: "http3",
    key: "http3",
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
    id: "0rtt",
    key: "zeroRtt",
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
    id: "rocket_loader",
    key: "rocketLoader",
    fallback: "off",
    values: new Set(["on", "off"]),
  },
];

export const automationSettingsByKey = new Map(
  automationSettingDefinitions.map((definition) => [definition.key, definition])
);

export const automationSettingsById = new Map(
  automationSettingDefinitions.map((definition) => [definition.id, definition])
);

export const automationFirewallDefinitions = {
  blockQueryParams: {
    key: "blockQueryParams",
    description: "[auto-optimization] block-query-params",
    expression: "len(http.request.uri.query) gt 0",
    label: "拦截带?参数",
  },
  blockNonChinaTraffic: {
    key: "blockNonChinaTraffic",
    description: "[auto-optimization] block-non-china-traffic",
    expression: 'not ip.geoip.country in {"CN"}',
    label: "拦截非中国流量",
  },
  blockNonGetTraffic: {
    key: "blockNonGetTraffic",
    description: "[auto-optimization] block-non-get-traffic",
    expression: 'http.request.method ne "GET"',
    label: "拦截非GET流量",
  },
};

export const automationFirewallDefinitionsByKey = new Map(
  Object.values(automationFirewallDefinitions).map((definition) => [
    definition.key,
    definition,
  ])
);

export const automationPageRuleDefinitions = {
  cacheAllPages: {
    key: "cacheAllPages",
    pattern(zoneName) {
      return zoneName ? `${zoneName}/*` : "";
    },
    label: "全站缓存",
  },
  cacheHtml: {
    key: "cacheHtml",
    pattern(zoneName) {
      return zoneName ? `${zoneName}/*.html*` : "";
    },
    label: "缓存HTML",
  },
};

export const automationPageRuleDefinitionsByKey = new Map(
  Object.values(automationPageRuleDefinitions).map((definition) => [
    definition.key,
    definition,
  ])
);

export const automationPresetDefinitions = {
  security: {
    key: "security",
    label: "安全",
    settings: {
      security_level: "high",
      ssl: "strict",
      always_use_https: "on",
      automatic_https_rewrites: "on",
      tls_1_3: "on",
      min_tls_version: "1.2",
      opportunistic_encryption: "on",
      cache_level: "basic",
      browser_cache_ttl: 14400,
      challenge_ttl: 1800,
      browser_check: "on",
      hotlink_protection: "on",
    },
  },
  speed: {
    key: "speed",
    label: "速度",
    settings: {
      security_level: "low",
      ssl: "flexible",
      cache_level: "aggressive",
      browser_cache_ttl: 31_536_000,
      polish: "lossless",
      minify: { css: "on", html: "on", js: "on" },
      brotli: "on",
      early_hints: "on",
      http3: "on",
    },
  },
};
