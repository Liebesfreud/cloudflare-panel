function matchRoute(method, pathname) {
  const developerResourceItemMatch = pathname.match(
    /^\/api\/developer-resources\/(?<type>pages|d1|r2|kv|tunnels)\/(?<resourceId>[^/]{1,256})$/i
  );

  if (developerResourceItemMatch) {
    return {
      key: `${method} /api/developer-resources/:type/:resourceId`,
      params: developerResourceItemMatch.groups,
    };
  }

  const developerResourcesMatch = pathname.match(
    /^\/api\/developer-resources\/(?<type>pages|d1|r2|kv|tunnels)$/i
  );

  if (developerResourcesMatch) {
    return {
      key: `${method} /api/developer-resources/:type`,
      params: developerResourcesMatch.groups,
    };
  }

  const workersRouteMatch = pathname.match(
    /^\/api\/workers\/(?<scriptName>[a-z0-9-]{1,63})\/routes\/(?<routeId>[a-z0-9_-]{1,128})$/i
  );

  if (workersRouteMatch) {
    return {
      key: `${method} /api/workers/:scriptName/routes/:routeId`,
      params: workersRouteMatch.groups,
    };
  }

  const workersRoutesMatch = pathname.match(
    /^\/api\/workers\/(?<scriptName>[a-z0-9-]{1,63})\/routes$/i
  );

  if (workersRoutesMatch) {
    return {
      key: `${method} /api/workers/:scriptName/routes`,
      params: workersRoutesMatch.groups,
    };
  }

  const workersDomainMatch = pathname.match(
    /^\/api\/workers\/(?<scriptName>[a-z0-9-]{1,63})\/domains\/(?<domainId>[a-z0-9_-]{1,128})$/i
  );

  if (workersDomainMatch) {
    return {
      key: `${method} /api/workers/:scriptName/domains/:domainId`,
      params: workersDomainMatch.groups,
    };
  }

  const workersDomainsMatch = pathname.match(
    /^\/api\/workers\/(?<scriptName>[a-z0-9-]{1,63})\/domains$/i
  );

  if (workersDomainsMatch) {
    return {
      key: `${method} /api/workers/:scriptName/domains`,
      params: workersDomainsMatch.groups,
    };
  }

  const workersSubdomainMatch = pathname.match(
    /^\/api\/workers\/(?<scriptName>[a-z0-9-]{1,63})\/subdomain$/i
  );

  if (workersSubdomainMatch) {
    return {
      key: `${method} /api/workers/:scriptName/subdomain`,
      params: workersSubdomainMatch.groups,
    };
  }

  const workerMatch = pathname.match(/^\/api\/workers\/(?<scriptName>[a-z0-9-]{1,63})$/i);

  if (workerMatch) {
    return {
      key: `${method} /api/workers/:scriptName`,
      params: workerMatch.groups,
    };
  }

  const zoneCustomCertificateMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/certificates\/(?<certificateId>[a-z0-9_-]{1,128})$/i
  );

  if (zoneCustomCertificateMatch) {
    return {
      key: `${method} /api/zones/:zoneId/certificates/:certificateId`,
      params: zoneCustomCertificateMatch.groups,
    };
  }

  const zoneCertificatesMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/certificates$/i
  );

  if (zoneCertificatesMatch) {
    return {
      key: `${method} /api/zones/:zoneId/certificates`,
      params: zoneCertificatesMatch.groups,
    };
  }

  const zonePageRuleMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/page-rules\/(?<ruleId>[a-z0-9]{32})$/i
  );

  if (zonePageRuleMatch) {
    return {
      key: `${method} /api/zones/:zoneId/page-rules/:ruleId`,
      params: zonePageRuleMatch.groups,
    };
  }

  const zonePageRulesMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/page-rules$/i
  );

  if (zonePageRulesMatch) {
    return {
      key: `${method} /api/zones/:zoneId/page-rules`,
      params: zonePageRulesMatch.groups,
    };
  }

  const zoneAnalyticsMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/analytics$/i
  );

  if (zoneAnalyticsMatch) {
    return {
      key: `${method} /api/zones/:zoneId/analytics`,
      params: zoneAnalyticsMatch.groups,
    };
  }

  const zoneCacheSettingsMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/cache-settings$/i
  );

  if (zoneCacheSettingsMatch) {
    return {
      key: `${method} /api/zones/:zoneId/cache-settings`,
      params: zoneCacheSettingsMatch.groups,
    };
  }

  const zoneCachePurgeMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/purge-cache$/i
  );

  if (zoneCachePurgeMatch) {
    return {
      key: `${method} /api/zones/:zoneId/purge-cache`,
      params: zoneCachePurgeMatch.groups,
    };
  }

  const zoneAutomationFirewallMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/automation\/firewall\/(?<ruleKey>[a-zA-Z0-9_-]+)$/i
  );

  if (zoneAutomationFirewallMatch) {
    return {
      key: `${method} /api/zones/:zoneId/automation/firewall/:ruleKey`,
      params: zoneAutomationFirewallMatch.groups,
    };
  }

  const zoneAutomationPageRuleMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/automation\/page-rules\/(?<ruleKey>[a-zA-Z0-9_-]+)$/i
  );

  if (zoneAutomationPageRuleMatch) {
    return {
      key: `${method} /api/zones/:zoneId/automation/page-rules/:ruleKey`,
      params: zoneAutomationPageRuleMatch.groups,
    };
  }

  const zoneAutomationDnsProxyMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/automation\/dns-proxy$/i
  );

  if (zoneAutomationDnsProxyMatch) {
    return {
      key: `${method} /api/zones/:zoneId/automation/dns-proxy`,
      params: zoneAutomationDnsProxyMatch.groups,
    };
  }

  const zoneAutomationTieredCachingMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/automation\/tiered-caching$/i
  );

  if (zoneAutomationTieredCachingMatch) {
    return {
      key: `${method} /api/zones/:zoneId/automation/tiered-caching`,
      params: zoneAutomationTieredCachingMatch.groups,
    };
  }

  const zoneAutomationApplyMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/automation\/apply$/i
  );

  if (zoneAutomationApplyMatch) {
    return {
      key: `${method} /api/zones/:zoneId/automation/apply`,
      params: zoneAutomationApplyMatch.groups,
    };
  }

  const zoneAutomationMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/automation$/i
  );

  if (zoneAutomationMatch) {
    return {
      key: `${method} /api/zones/:zoneId/automation`,
      params: zoneAutomationMatch.groups,
    };
  }

  const zoneDnsRecordsMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/dns-records$/i
  );

  if (zoneDnsRecordsMatch) {
    return {
      key: `${method} /api/zones/:zoneId/dns-records`,
      params: zoneDnsRecordsMatch.groups,
    };
  }

  const zoneSpeedDeployMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/speed-deploy$/i
  );

  if (zoneSpeedDeployMatch) {
    return {
      key: `${method} /api/zones/:zoneId/speed-deploy`,
      params: zoneSpeedDeployMatch.groups,
    };
  }

  const zoneDnsRecordMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/dns-records\/(?<recordId>[a-z0-9]{32})$/i
  );

  if (zoneDnsRecordMatch) {
    return {
      key: `${method} /api/zones/:zoneId/dns-records/:recordId`,
      params: zoneDnsRecordMatch.groups,
    };
  }

  const zoneFirewallRulesMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/firewall-rules$/i
  );

  if (zoneFirewallRulesMatch) {
    return {
      key: `${method} /api/zones/:zoneId/firewall-rules`,
      params: zoneFirewallRulesMatch.groups,
    };
  }

  const zoneFirewallRuleMatch = pathname.match(
    /^\/api\/zones\/(?<zoneId>[a-z0-9]{32})\/firewall-rules\/(?<ruleId>[a-z0-9]{32})$/i
  );

  if (zoneFirewallRuleMatch) {
    return {
      key: `${method} /api/zones/:zoneId/firewall-rules/:ruleId`,
      params: zoneFirewallRuleMatch.groups,
    };
  }

  return { key: `${method} ${pathname}`, params: {} };
}

export function createApiRouter({
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
  const routes = new Map([
    ["GET /api/session/status", credentialsController.status],
    ["POST /api/session/connect", credentialsController.connect],
    ["GET /api/developer-resources/:type", developerResourcesController.list],
    ["POST /api/developer-resources/:type", developerResourcesController.create],
    [
      "DELETE /api/developer-resources/:type/:resourceId",
      developerResourcesController.delete,
    ],
    ["GET /api/workers", workersController.list],
    ["POST /api/workers", workersController.create],
    ["GET /api/workers/:scriptName", workersController.get],
    ["PUT /api/workers/:scriptName", workersController.update],
    ["DELETE /api/workers/:scriptName", workersController.delete],
    ["POST /api/workers/:scriptName/subdomain", workersController.updateSubdomain],
    ["GET /api/workers/:scriptName/routes", workersController.listRoutes],
    ["POST /api/workers/:scriptName/routes", workersController.createRoute],
    ["DELETE /api/workers/:scriptName/routes/:routeId", workersController.deleteRoute],
    ["GET /api/workers/:scriptName/domains", workersController.listDomains],
    ["PUT /api/workers/:scriptName/domains", workersController.createDomain],
    ["DELETE /api/workers/:scriptName/domains/:domainId", workersController.deleteDomain],
    ["GET /api/zones", zonesController.list],
    ["GET /api/zones/:zoneId/analytics", analyticsController.get],
    ["GET /api/zones/:zoneId/automation", automationController.get],
    ["PATCH /api/zones/:zoneId/automation", automationController.updateSettings],
    ["POST /api/zones/:zoneId/automation/apply", automationController.applyPreset],
    ["PATCH /api/zones/:zoneId/automation/dns-proxy", automationController.updateDnsProxy],
    [
      "PATCH /api/zones/:zoneId/automation/firewall/:ruleKey",
      automationController.updateFirewall,
    ],
    [
      "PATCH /api/zones/:zoneId/automation/page-rules/:ruleKey",
      automationController.updatePageRule,
    ],
    [
      "PATCH /api/zones/:zoneId/automation/tiered-caching",
      automationController.updateTieredCaching,
    ],
    ["GET /api/zones/:zoneId/cache-settings", cacheSettingsController.get],
    ["PATCH /api/zones/:zoneId/cache-settings", cacheSettingsController.update],
    ["POST /api/zones/:zoneId/purge-cache", cacheSettingsController.purge],
    ["GET /api/zones/:zoneId/certificates", certificatesController.get],
    [
      "DELETE /api/zones/:zoneId/certificates/:certificateId",
      certificatesController.delete,
    ],
    ["GET /api/zones/:zoneId/dns-records", dnsRecordsController.list],
    ["POST /api/zones/:zoneId/dns-records", dnsRecordsController.create],
    ["PATCH /api/zones/:zoneId/dns-records/:recordId", dnsRecordsController.update],
    ["DELETE /api/zones/:zoneId/dns-records/:recordId", dnsRecordsController.delete],
    ["POST /api/zones/:zoneId/speed-deploy", speedDeployController.deploy],
    ["GET /api/zones/:zoneId/firewall-rules", firewallRulesController.list],
    ["POST /api/zones/:zoneId/firewall-rules", firewallRulesController.create],
    ["PATCH /api/zones/:zoneId/firewall-rules/:ruleId", firewallRulesController.update],
    [
      "DELETE /api/zones/:zoneId/firewall-rules/:ruleId",
      firewallRulesController.delete,
    ],
    ["GET /api/zones/:zoneId/page-rules", pageRulesController.list],
    ["POST /api/zones/:zoneId/page-rules", pageRulesController.create],
    ["PATCH /api/zones/:zoneId/page-rules/:ruleId", pageRulesController.update],
    ["DELETE /api/zones/:zoneId/page-rules/:ruleId", pageRulesController.delete],
  ]);

  return {
    match(request, url) {
      const match = matchRoute(request.method, url.pathname);
      const handler = routes.get(match.key);

      if (!handler) {
        return null;
      }

      return (context) => handler({ ...context, params: match.params });
    },
    isApiPath(url) {
      return url.pathname.startsWith("/api/");
    },
  };
}
