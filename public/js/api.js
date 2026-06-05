async function readJson(response, fallbackMessage) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage);
  }

  return payload;
}

export async function fetchZones() {
  const response = await fetch("/api/zones");
  const payload = await readJson(response, "读取域名失败");

  return payload.zones;
}

export async function fetchSessionStatus() {
  const response = await fetch("/api/session/status");
  return readJson(response, "读取连接状态失败");
}

export async function connectCloudflareAccount(credentials) {
  const response = await fetch("/api/session/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  return readJson(response, "验证 Cloudflare 凭据失败");
}

export async function fetchDnsRecords(zoneId) {
  const response = await fetch(`/api/zones/${zoneId}/dns-records`);
  const payload = await readJson(response, "读取 DNS 记录失败");

  return payload.records;
}

export async function createDnsRecord(zoneId, record) {
  const response = await fetch(`/api/zones/${zoneId}/dns-records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  const payload = await readJson(response, "保存 DNS 记录失败");

  return payload.record;
}

export async function updateDnsRecord(zoneId, recordId, record) {
  const response = await fetch(`/api/zones/${zoneId}/dns-records/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  const payload = await readJson(response, "保存 DNS 记录失败");

  return payload.record;
}

export async function removeDnsRecord(zoneId, recordId) {
  const response = await fetch(`/api/zones/${zoneId}/dns-records/${recordId}`, {
    method: "DELETE",
  });

  return readJson(response, "删除 DNS 记录失败");
}

export async function fetchCacheSettings(zoneId) {
  const response = await fetch(`/api/zones/${zoneId}/cache-settings`);
  return readJson(response, "读取缓存设置失败");
}

export async function fetchCertificates(zoneId) {
  const response = await fetch(`/api/zones/${zoneId}/certificates`);
  return readJson(response, "读取证书状态失败");
}

export async function fetchZoneAnalytics(zoneId, days = 7) {
  const response = await fetch(`/api/zones/${zoneId}/analytics?days=${encodeURIComponent(days)}`);
  const payload = await readJson(response, "读取统计分析失败");

  return payload.analytics;
}

export async function saveCacheSettings(zoneId, settings) {
  const response = await fetch(`/api/zones/${zoneId}/cache-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

  return readJson(response, "保存缓存设置失败");
}

export async function purgeCache(zoneId, request) {
  const response = await fetch(`/api/zones/${zoneId}/purge-cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return readJson(response, "清除缓存失败");
}

export async function fetchFirewallRules(zoneId) {
  const response = await fetch(`/api/zones/${zoneId}/firewall-rules`);
  const payload = await readJson(response, "读取防火墙规则失败");

  return payload.rules;
}

export async function fetchPageRules(zoneId) {
  const response = await fetch(`/api/zones/${zoneId}/page-rules`);
  const payload = await readJson(response, "读取页面规则失败");

  return payload.rules;
}

export async function createFirewallRule(zoneId, rule) {
  const response = await fetch(`/api/zones/${zoneId}/firewall-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  const payload = await readJson(response, "创建防火墙规则失败");

  return payload.rule;
}

export async function createPageRule(zoneId, rule) {
  const response = await fetch(`/api/zones/${zoneId}/page-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  const payload = await readJson(response, "创建页面规则失败");

  return payload.rule;
}

export async function updateFirewallRule(zoneId, ruleId, rule) {
  const response = await fetch(`/api/zones/${zoneId}/firewall-rules/${ruleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  const payload = await readJson(response, "更新防火墙规则失败");

  return payload.rule;
}

export async function updatePageRule(zoneId, ruleId, rule) {
  const response = await fetch(`/api/zones/${zoneId}/page-rules/${ruleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  });
  const payload = await readJson(response, "更新页面规则失败");

  return payload.rule;
}

export async function removeFirewallRule(zoneId, ruleId) {
  const response = await fetch(`/api/zones/${zoneId}/firewall-rules/${ruleId}`, {
    method: "DELETE",
  });

  return readJson(response, "删除防火墙规则失败");
}

export async function removePageRule(zoneId, ruleId) {
  const response = await fetch(`/api/zones/${zoneId}/page-rules/${ruleId}`, {
    method: "DELETE",
  });

  return readJson(response, "删除页面规则失败");
}

export async function removeCustomCertificate(zoneId, certificateId) {
  const response = await fetch(`/api/zones/${zoneId}/certificates/${certificateId}`, {
    method: "DELETE",
  });

  return readJson(response, "删除证书失败");
}

export async function deploySpeedAcceleration(zoneId, request) {
  const response = await fetch(`/api/zones/${zoneId}/speed-deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response, "部署一键加速失败");

  return payload.deployment;
}

function accountQuery(accountId) {
  return accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
}

export async function fetchWorkers(accountId = "") {
  const response = await fetch(`/api/workers${accountQuery(accountId)}`);
  const payload = await readJson(response, "读取 Workers 失败");

  return payload.workers;
}

export async function fetchWorker(scriptName, accountId = "") {
  const response = await fetch(
    `/api/workers/${encodeURIComponent(scriptName)}${accountQuery(accountId)}`
  );
  const payload = await readJson(response, "读取 Worker 详情失败");

  return payload.worker;
}

export async function createWorker(request) {
  const response = await fetch("/api/workers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response, "创建 Worker 失败");

  return payload.worker;
}

export async function saveWorkerScript(scriptName, request) {
  const response = await fetch(`/api/workers/${encodeURIComponent(scriptName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response, "保存 Worker 失败");

  return payload.worker;
}

export async function removeWorker(scriptName, accountId = "") {
  const response = await fetch(
    `/api/workers/${encodeURIComponent(scriptName)}${accountQuery(accountId)}`,
    { method: "DELETE" }
  );

  return readJson(response, "删除 Worker 失败");
}

export async function saveWorkerSubdomain(scriptName, request) {
  const response = await fetch(`/api/workers/${encodeURIComponent(scriptName)}/subdomain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return readJson(response, "保存 workers.dev 子域设置失败");
}

export async function fetchWorkerRoutes(scriptName, zoneId) {
  const response = await fetch(
    `/api/workers/${encodeURIComponent(scriptName)}/routes?zoneId=${encodeURIComponent(zoneId)}`
  );
  const payload = await readJson(response, "读取 Worker 路由失败");

  return payload.routes;
}

export async function createWorkerRoute(scriptName, request) {
  const response = await fetch(`/api/workers/${encodeURIComponent(scriptName)}/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response, "添加 Worker 路由失败");

  return payload.route;
}

export async function removeWorkerRoute(scriptName, routeId, zoneId) {
  const response = await fetch(
    `/api/workers/${encodeURIComponent(scriptName)}/routes/${encodeURIComponent(
      routeId
    )}?zoneId=${encodeURIComponent(zoneId)}`,
    { method: "DELETE" }
  );

  return readJson(response, "删除 Worker 路由失败");
}

export async function createWorkerDomain(scriptName, request) {
  const response = await fetch(`/api/workers/${encodeURIComponent(scriptName)}/domains`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response, "添加 Worker 自定义域失败");

  return payload.domain;
}

export async function removeWorkerDomain(scriptName, domainId, accountId = "") {
  const response = await fetch(
    `/api/workers/${encodeURIComponent(scriptName)}/domains/${encodeURIComponent(
      domainId
    )}${accountQuery(accountId)}`,
    { method: "DELETE" }
  );

  return readJson(response, "删除 Worker 自定义域失败");
}

export async function fetchDeveloperResources(type, accountId = "") {
  const response = await fetch(
    `/api/developer-resources/${encodeURIComponent(type)}${accountQuery(accountId)}`
  );
  const payload = await readJson(response, "读取资源列表失败");

  return payload.resources;
}

export async function createDeveloperResource(type, request) {
  const response = await fetch(`/api/developer-resources/${encodeURIComponent(type)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response, "创建资源失败");

  return payload.resource;
}

export async function removeDeveloperResource(type, resourceId, accountId = "") {
  const response = await fetch(
    `/api/developer-resources/${encodeURIComponent(type)}/${encodeURIComponent(
      resourceId
    )}${accountQuery(accountId)}`,
    { method: "DELETE" }
  );

  return readJson(response, "删除资源失败");
}

export async function fetchAutomationState(zoneId) {
  const response = await fetch(`/api/zones/${zoneId}/automation`);
  const payload = await readJson(response, "读取自动优化设置失败");

  return payload.automation;
}

export async function saveAutomationSettings(zoneId, settings) {
  const response = await fetch(`/api/zones/${zoneId}/automation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const payload = await readJson(response, "保存自动优化设置失败");

  return payload.automation;
}

export async function applyAutomationPreset(zoneId, preset) {
  const response = await fetch(`/api/zones/${zoneId}/automation/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset }),
  });
  const payload = await readJson(response, "应用自动优化预设失败");

  return payload.automation;
}

export async function saveAutomationDnsProxy(zoneId, enabled) {
  const response = await fetch(`/api/zones/${zoneId}/automation/dns-proxy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  const payload = await readJson(response, "保存 DNS 代理状态失败");

  return payload.automation;
}

export async function saveAutomationFirewallRule(zoneId, ruleKey, enabled) {
  const response = await fetch(`/api/zones/${zoneId}/automation/firewall/${ruleKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  const payload = await readJson(response, "保存自动优化防火墙规则失败");

  return payload.automation;
}

export async function saveAutomationPageRule(zoneId, ruleKey, enabled) {
  const response = await fetch(`/api/zones/${zoneId}/automation/page-rules/${ruleKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  const payload = await readJson(response, "保存自动优化页面规则失败");

  return payload.automation;
}

export async function saveAutomationTieredCaching(zoneId, enabled) {
  const response = await fetch(`/api/zones/${zoneId}/automation/tiered-caching`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  const payload = await readJson(response, "保存分层缓存失败");

  return payload.automation;
}
