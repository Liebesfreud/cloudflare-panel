export function bindEvents(actions) {
  document
    .querySelector("#cloudflare-connect-form")
    ?.addEventListener("submit", actions.connectSession);
  document.querySelector("#connect-with-server-credentials")?.addEventListener("click", () => {
    actions.connectSession();
  });
  document.querySelector("#logout-session")?.addEventListener("click", actions.logoutSession);
  document.querySelector("#add-domain-form")?.addEventListener("submit", actions.addDomain);
  document.querySelector("#back-to-domains")?.addEventListener("click", actions.backToDomains);
  document.querySelector("#refresh-zone-settings")?.addEventListener("click", actions.refreshZoneSettings);
  document.querySelector("#open-dns-form")?.addEventListener("click", actions.openCreateDnsForm);
  document.querySelector("#dns-record-form")?.addEventListener("submit", actions.saveDnsRecord);
  document.querySelector("#cancel-dns-edit")?.addEventListener("click", actions.resetDnsForm);
  document.querySelector("#reset-dns-form")?.addEventListener("click", actions.resetDnsForm);
  document
    .querySelector('#dns-record-form select[name="type"]')
    ?.addEventListener("change", actions.syncDnsFormType);
  document.querySelector("#browser-cache-ttl")?.addEventListener("change", actions.saveBrowserCacheTtl);
  document.querySelector("#purge-all-cache")?.addEventListener("click", actions.purgeAllCache);
  document.querySelector("#purge-url-form")?.addEventListener("submit", actions.purgeCacheByUrl);
  document.querySelector("#firewall-rule-form")?.addEventListener("submit", actions.saveFirewallRule);
  document.querySelector("#page-rule-form")?.addEventListener("submit", actions.savePageRule);
  document
    .querySelector("#firewall-rule-type")
    ?.addEventListener("change", actions.syncFirewallRuleType);
  document
    .querySelectorAll("[data-page-rule-exclusive]")
    .forEach((input) => input.addEventListener("change", actions.syncPageRuleExclusiveFields));
  document.querySelector("#speed-form")?.addEventListener("submit", actions.submitSpeedConfig);
  document
    .querySelector("#speed-open-domains")
    ?.addEventListener("click", actions.openSpeedDomainsDialog);
  document
    .querySelectorAll(".speed-close-domains")
    .forEach((button) => button.addEventListener("click", actions.closeSpeedDomainsDialog));
  document
    .querySelector("#speed-refresh-domains")
    ?.addEventListener("click", actions.refreshSpeedDomainsDialog);
  document.querySelectorAll(".speed-domain-delete").forEach((button) => {
    button.addEventListener("click", () =>
      actions.requestDeleteSpeedDomain(button.dataset.speedDomainId)
    );
  });
  document
    .querySelector("#speed-cancel-delete-domain")
    ?.addEventListener("click", actions.cancelDeleteSpeedDomain);
  document
    .querySelector("#speed-confirm-delete-domain")
    ?.addEventListener("click", actions.confirmDeleteSpeedDomain);
  document
    .querySelector("#speed-back")
    ?.addEventListener("click", actions.backToSpeedConfig);
  document.querySelector("#speed-start")?.addEventListener("click", actions.startSpeedDeploy);
  document.querySelector("#speed-next")?.addEventListener("click", actions.deployNextSpeedDomain);
  document
    .querySelector("#workers-account")
    ?.addEventListener("change", actions.changeWorkersAccount);
  document.querySelector("#workers-refresh")?.addEventListener("click", actions.loadWorkers);
  document
    .querySelector("#workers-new")
    ?.addEventListener("click", actions.openCreateWorkerModal);
  document
    .querySelectorAll(".workers-modal-close")
    .forEach((button) => button.addEventListener("click", actions.closeWorkersModal));
  document
    .querySelector("#worker-create-form")
    ?.addEventListener("submit", actions.submitCreateWorker);
  document
    .querySelector("#worker-editor-form")
    ?.addEventListener("submit", actions.submitWorkerScript);
  document
    .querySelector("#worker-subdomain-toggle")
    ?.addEventListener("change", actions.toggleWorkerSubdomain);
  document
    .querySelector("#worker-route-zone")
    ?.addEventListener("change", actions.changeWorkerRouteZone);
  document
    .querySelector("#worker-domain-zone")
    ?.addEventListener("change", actions.changeWorkerDomainZone);
  document
    .querySelector("#worker-route-form")
    ?.addEventListener("submit", actions.submitWorkerRoute);
  document
    .querySelector("#worker-domain-form")
    ?.addEventListener("submit", actions.submitWorkerDomain);
  document.querySelectorAll("[data-worker-tab]").forEach((button) => {
    button.addEventListener("click", actions.changeWorkerTab);
  });
  document.querySelectorAll(".workers-edit").forEach((button) => {
    button.addEventListener("click", () => actions.openEditWorker(button.dataset.workerName));
  });
  document.querySelectorAll(".workers-delete-request").forEach((button) => {
    button.addEventListener("click", () =>
      actions.requestDeleteWorker(button.dataset.workerName)
    );
  });
  document.querySelectorAll(".worker-route-delete").forEach((button) => {
    button.addEventListener("click", () => actions.deleteWorkerRoute(button.dataset.routeId));
  });
  document.querySelectorAll(".worker-domain-delete").forEach((button) => {
    button.addEventListener("click", () => actions.deleteWorkerDomain(button.dataset.domainId));
  });
  document
    .querySelector("#worker-delete-confirm-input")
    ?.addEventListener("input", actions.updateWorkerDeleteConfirm);
  document
    .querySelector("#worker-delete-confirm")
    ?.addEventListener("click", actions.confirmDeleteWorker);
  document
    .querySelector("#devres-account")
    ?.addEventListener("change", actions.changeDeveloperResourceAccount);
  document
    .querySelector("#devres-refresh")
    ?.addEventListener("click", actions.loadDeveloperResources);
  document
    .querySelector("#devres-new")
    ?.addEventListener("click", actions.openDeveloperResourceCreateModal);
  document
    .querySelectorAll(".devres-modal-close")
    .forEach((button) => button.addEventListener("click", actions.closeDeveloperResourceModal));
  document
    .querySelector("#devres-create-form")
    ?.addEventListener("submit", actions.submitDeveloperResource);
  document.querySelectorAll(".devres-delete-request").forEach((button) => {
    button.addEventListener("click", () =>
      actions.requestDeleteDeveloperResource(button.dataset.devresId, button.dataset.devresName)
    );
  });
  document
    .querySelector("#devres-delete-confirm-input")
    ?.addEventListener("input", actions.updateDeveloperResourceDeleteConfirm);
  document
    .querySelector("#devres-delete-confirm")
    ?.addEventListener("click", actions.confirmDeleteDeveloperResource);
  document
    .querySelector("#template-refresh")
    ?.addEventListener("click", actions.reloadWorkerTemplates);
  document
    .querySelector("#template-new")
    ?.addEventListener("click", actions.openWorkerTemplateModal);
  document
    .querySelectorAll(".template-modal-close")
    .forEach((button) => button.addEventListener("click", actions.closeWorkerTemplateModal));
  document
    .querySelector("#template-create-form")
    ?.addEventListener("submit", actions.submitWorkerTemplate);
  document.querySelectorAll(".template-use").forEach((button) => {
    button.addEventListener("click", () => actions.useWorkerTemplate(button.dataset.templateId));
  });
  document.querySelectorAll(".template-delete").forEach((button) => {
    button.addEventListener("click", () => actions.deleteWorkerTemplate(button.dataset.templateId));
  });
  document
    .querySelector("#reset-firewall-form")
    ?.addEventListener("click", actions.resetFirewallRuleForm);
  document
    .querySelector("#reset-page-rule-form")
    ?.addEventListener("click", actions.resetPageRuleForm);
  document
    .querySelector("#automation-zone")
    ?.addEventListener("change", actions.changeAutomationZone);
  document
    .querySelector("#automation-preset")
    ?.addEventListener("change", actions.changeAutomationPreset);
  document
    .querySelector("#automation-apply-preset")
    ?.addEventListener("click", actions.applyAutomationPreset);
  document
    .querySelector("#automation-refresh")
    ?.addEventListener("click", actions.loadAutomationState);
  document.querySelectorAll("[data-automation-setting]").forEach((input) => {
    const handler =
      input.dataset.automationSetting === "securityLevel"
        ? actions.updateAutomationSecurityLevel
        : actions.updateAutomationSetting;
    input.addEventListener("change", handler);
  });
  document.querySelectorAll("[data-automation-minify]").forEach((button) => {
    button.addEventListener("click", actions.toggleAutomationMinify);
  });
  document.querySelector("#automation-dns-proxy")?.addEventListener("change", actions.toggleAutomationDnsProxy);
  document.querySelector("#automation-under-attack")?.addEventListener("change", actions.toggleUnderAttackMode);
  document.querySelector("#automation-tiered-caching")?.addEventListener("change", actions.toggleAutomationTieredCaching);
  document.querySelectorAll("[data-automation-firewall]").forEach((input) => {
    input.addEventListener("change", actions.toggleAutomationFirewall);
  });
  document.querySelectorAll("[data-automation-page-rule]").forEach((input) => {
    input.addEventListener("change", actions.toggleAutomationPageRule);
  });
  document
    .querySelector("#toggle-firewall-examples")
    ?.addEventListener("click", actions.toggleFirewallExamples);
  document.querySelector("#refresh-firewall-rules")?.addEventListener("click", actions.loadFirewallRules);
  document.querySelector("#refresh-page-rules")?.addEventListener("click", actions.loadPageRules);
  document.querySelector("#refresh-certificates")?.addEventListener("click", actions.loadCertificates);
  document.querySelectorAll("[data-analytics-range]").forEach((button) => {
    button.addEventListener("click", () =>
      actions.changeAnalyticsRange(button.dataset.analyticsRange)
    );
  });
  document.querySelector("#focus-firewall-form")?.addEventListener("click", () => {
    document.querySelector("#firewall-rule-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  document.querySelectorAll("[data-zone-id]").forEach((row) => {
    row.addEventListener("click", () => actions.openZone(row.dataset.zoneId));
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      actions.openZone(row.dataset.zoneId);
    });
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", (event) => actions.copyToClipboard(event, button.dataset.copy));
  });

  document.querySelectorAll("[data-zone-section]").forEach((button) => {
    button.addEventListener("click", () => actions.openZoneSection(button.dataset.zoneSection));
  });

  document.querySelectorAll("[data-main-section]").forEach((button) => {
    button.addEventListener("click", () => actions.openMainSection(button.dataset.mainSection));
  });

  document.querySelectorAll(".edit-dns-button").forEach((button) => {
    button.addEventListener("click", () => actions.editDnsRecord(button.dataset.recordId));
  });

  document.querySelectorAll(".delete-dns-button").forEach((button) => {
    button.addEventListener("click", () => actions.deleteDnsRecord(button.dataset.recordId));
  });

  document.querySelectorAll(".cache-level-option").forEach((button) => {
    button.addEventListener("click", () => actions.saveCacheLevel(button));
  });

  document.querySelectorAll("[data-cache-toggle]").forEach((input) => {
    input.addEventListener("change", () => actions.toggleCacheSetting(input));
  });

  document.querySelectorAll(".delete-firewall-rule").forEach((button) => {
    button.addEventListener("click", () => actions.deleteFirewallRule(button.dataset.ruleId));
  });

  document.querySelectorAll(".edit-firewall-rule").forEach((button) => {
    button.addEventListener("click", () => actions.editFirewallRule(button.dataset.ruleId));
  });

  document.querySelectorAll(".toggle-firewall-rule").forEach((button) => {
    button.addEventListener("click", () => actions.toggleFirewallRule(button.dataset.ruleId));
  });

  document.querySelectorAll(".edit-page-rule").forEach((button) => {
    button.addEventListener("click", () => actions.editPageRule(button.dataset.ruleId));
  });

  document.querySelectorAll(".delete-page-rule").forEach((button) => {
    button.addEventListener("click", () => actions.deletePageRule(button.dataset.ruleId));
  });

  document.querySelectorAll(".toggle-page-rule").forEach((input) => {
    input.addEventListener("change", () => actions.togglePageRule(input.dataset.ruleId));
  });

  document.querySelectorAll(".delete-certificate").forEach((button) => {
    button.addEventListener("click", () =>
      actions.deleteCustomCertificate(button.dataset.certificateId)
    );
  });

  document.querySelectorAll("[data-firewall-example]").forEach((button) => {
    button.addEventListener("click", () =>
      actions.useFirewallExample(button.dataset.firewallExample)
    );
  });
}
