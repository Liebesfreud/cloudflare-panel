import {
  createFirewallRule,
  createPageRule,
  fetchCacheSettings,
  fetchCertificates,
  fetchFirewallRules,
  fetchPageRules,
  purgeCache,
  removeCustomCertificate,
  removeFirewallRule,
  removePageRule,
  saveCacheSettings,
  updateFirewallRule,
  updatePageRule,
} from "../api.js";
import { defaultFirewallForm, defaultPageRuleForm } from "../constants.js";
import { findFirewallExample } from "../firewall-examples.js";
import { resetFirewallForm, resetPageRuleForm, state } from "../state.js";

function readSelectedZoneId() {
  return state.selectedZone?.id || "";
}

function readFirewallForm() {
  const form = document.querySelector("#firewall-rule-form");

  if (!form) {
    return { ...state.firewallForm };
  }

  const formData = new FormData(form);

  return {
    type: String(formData.get("type") || defaultFirewallForm.type),
    action: String(formData.get("action") || defaultFirewallForm.action),
    target: String(formData.get("target") || "").trim(),
    description: String(formData.get("description") || "").trim(),
  };
}

function readPageRuleForm() {
  const form = document.querySelector("#page-rule-form");

  if (!form) {
    return { ...state.pageRuleForm };
  }

  const formData = new FormData(form);

  return {
    urlPattern: String(formData.get("urlPattern") || "").trim(),
    cacheLevel: String(formData.get("cacheLevel") || ""),
    browserCacheTtl: String(formData.get("browserCacheTtl") || ""),
    securityLevel: String(formData.get("securityLevel") || ""),
    ssl: String(formData.get("ssl") || ""),
    alwaysUseHttps: String(formData.get("alwaysUseHttps") || ""),
    forwardingType: String(formData.get("forwardingType") || ""),
    forwardingUrl: String(formData.get("forwardingUrl") || "").trim(),
    status: String(formData.get("status") || defaultPageRuleForm.status),
  };
}

function applyCachePayload(payload) {
  state.cacheSettings = payload.settings || null;
  state.cacheWarnings = Array.isArray(payload.warnings) ? payload.warnings : [];
}

function readFirewallRuleForm(rule) {
  const expression = String(rule.expression || "").trim();
  const ipMatch = expression.match(/^ip\.src eq ([^\s]+)$/);
  const countryMatch = expression.match(/^ip\.geoip\.country eq "([A-Za-z]{2})"$/);
  const asnMatch = expression.match(/^ip\.geoip\.asnum eq (\d+)$/);

  if (ipMatch) {
    return {
      type: "ip",
      action: rule.action || defaultFirewallForm.action,
      target: ipMatch[1],
      description: rule.description || "",
    };
  }

  if (countryMatch) {
    return {
      type: "country",
      action: rule.action || defaultFirewallForm.action,
      target: countryMatch[1].toUpperCase(),
      description: rule.description || "",
    };
  }

  if (asnMatch) {
    return {
      type: "asn",
      action: rule.action || defaultFirewallForm.action,
      target: asnMatch[1],
      description: rule.description || "",
    };
  }

  return {
    type: "custom",
    action: rule.action || defaultFirewallForm.action,
    target: expression,
    description: rule.description || "",
  };
}

function buildFirewallUpdatePayload(rule, overrides = {}) {
  return {
    type: "custom",
    action: rule.action || defaultFirewallForm.action,
    target: rule.expression || "",
    description: rule.description || "",
    filterId: rule.filterId || "",
    paused: Boolean(rule.paused),
    ...overrides,
  };
}

function readPageRulePayload(rule, overrides = {}) {
  return {
    urlPattern: rule.urlPattern || "",
    cacheLevel: rule.cacheLevel || "",
    browserCacheTtl: rule.browserCacheTtl || "",
    securityLevel: rule.securityLevel || "",
    ssl: rule.ssl || "",
    alwaysUseHttps: rule.alwaysUseHttps || "",
    forwardingType: rule.forwardingType || "",
    forwardingUrl: rule.forwardingUrl || "",
    status: rule.status || "active",
    ...overrides,
  };
}

function applyCertificatePayload(payload) {
  state.customCertificates = Array.isArray(payload.certificates)
    ? payload.certificates
    : [];
  state.universalSsl = payload.universalSsl || null;
  state.certificateWarnings = Array.isArray(payload.warnings) ? payload.warnings : [];
}

export function createZoneSettingsActions({ renderApp }) {
  async function loadCacheSettings() {
    const zoneId = readSelectedZoneId();

    if (!zoneId) {
      return;
    }

    state.loadingCacheSettings = true;
    state.cacheError = "";
    renderApp();

    try {
      applyCachePayload(await fetchCacheSettings(zoneId));
    } catch (error) {
      state.cacheError = error.message;
    } finally {
      state.loadingCacheSettings = false;
      renderApp();
    }
  }

  async function loadFirewallRules() {
    const zoneId = readSelectedZoneId();

    if (!zoneId) {
      return;
    }

    state.loadingFirewallRules = true;
    state.firewallError = "";
    renderApp();

    try {
      state.firewallRules = await fetchFirewallRules(zoneId);
    } catch (error) {
      state.firewallError = error.message;
    } finally {
      state.loadingFirewallRules = false;
      renderApp();
    }
  }

  async function loadPageRules() {
    const zoneId = readSelectedZoneId();

    if (!zoneId) {
      return;
    }

    state.loadingPageRules = true;
    state.pageRulesError = "";
    renderApp();

    try {
      state.pageRules = await fetchPageRules(zoneId);
    } catch (error) {
      state.pageRulesError = error.message;
    } finally {
      state.loadingPageRules = false;
      renderApp();
    }
  }

  async function loadCertificates() {
    const zoneId = readSelectedZoneId();

    if (!zoneId) {
      return;
    }

    state.loadingCertificates = true;
    state.certificateError = "";
    renderApp();

    try {
      applyCertificatePayload(await fetchCertificates(zoneId));
    } catch (error) {
      state.certificateError = error.message;
    } finally {
      state.loadingCertificates = false;
      renderApp();
    }
  }

  async function refreshZoneSettings() {
    if (state.zoneSection === "cache") {
      await loadCacheSettings();
      return;
    }

    if (state.zoneSection === "firewall") {
      await loadFirewallRules();
      return;
    }

    if (state.zoneSection === "rules") {
      await loadPageRules();
      return;
    }

    if (state.zoneSection === "certificates") {
      await loadCertificates();
    }
  }

  async function updateCacheSetting(key, value) {
    const zoneId = readSelectedZoneId();

    if (!zoneId || state.savingCacheSettings) {
      return;
    }

    state.savingCacheSettings = true;
    state.notice = "";
    renderApp();

    try {
      applyCachePayload(await saveCacheSettings(zoneId, { [key]: value }));
      state.notice = "缓存设置已保存";
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.savingCacheSettings = false;
      renderApp();
    }
  }

  async function saveCacheLevel(button) {
    await updateCacheSetting("cacheLevel", button.dataset.cacheLevel);
  }

  async function saveBrowserCacheTtl(event) {
    await updateCacheSetting("browserCacheTtl", Number(event.target.value));
  }

  async function toggleCacheSetting(input) {
    await updateCacheSetting(input.dataset.cacheToggle, input.checked);
  }

  async function purgeAllCache() {
    const zoneId = readSelectedZoneId();

    if (!zoneId || state.purgingCache) {
      return;
    }

    const confirmed = window.confirm("确定清除当前域名的所有 Cloudflare 缓存吗？");

    if (!confirmed) {
      return;
    }

    state.purgingCache = true;
    state.notice = "";
    renderApp();

    try {
      await purgeCache(zoneId, { mode: "everything" });
      state.notice = "已提交清除所有缓存请求";
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.purgingCache = false;
      renderApp();
    }
  }

  async function purgeCacheByUrl(event) {
    event.preventDefault();
    const zoneId = readSelectedZoneId();

    if (!zoneId || state.purgingCache) {
      return;
    }

    const input = document.querySelector("#cache-purge-url");
    const url = input?.value.trim() || "";

    state.purgingCache = true;
    state.notice = "";
    renderApp();

    try {
      await purgeCache(zoneId, { mode: "url", url });

      if (input) {
        input.value = "";
      }

      state.notice = "已提交 URL 清除请求";
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.purgingCache = false;
      renderApp();
    }
  }

  function syncFirewallRuleType(event) {
    state.firewallForm = {
      ...readFirewallForm(),
      type: event.target.value,
      target: "",
    };
    state.notice = "";
    renderApp();
  }

  function toggleFirewallExamples() {
    state.firewallForm = readFirewallForm();
    state.showFirewallExamples = !state.showFirewallExamples;
    renderApp();
  }

  function useFirewallExample(exampleId) {
    const example = findFirewallExample(exampleId);

    if (!example) {
      return;
    }

    state.firewallForm = {
      ...readFirewallForm(),
      type: "custom",
      action: example.action,
      target: example.expression,
      description: example.description,
    };
    state.showFirewallExamples = true;
    state.notice = "";
    renderApp();
  }

  function editFirewallRule(ruleId) {
    const rule = state.firewallRules.find((item) => item.id === ruleId);

    if (!rule) {
      return;
    }

    state.firewallForm = readFirewallRuleForm(rule);
    state.editingFirewallRuleId = ruleId;
    state.showFirewallExamples = state.firewallForm.type === "custom";
    state.notice = "";
    renderApp();
    document.querySelector("#firewall-rule-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function resetFirewallRuleForm() {
    resetFirewallForm();
    state.notice = "";
    renderApp();
  }

  async function saveFirewallRule(event) {
    event.preventDefault();
    const zoneId = readSelectedZoneId();

    if (!zoneId || state.savingFirewallRule) {
      return;
    }

    state.firewallForm = readFirewallForm();
    state.savingFirewallRule = true;
    state.notice = "";
    renderApp();

    try {
      const editingRule = state.firewallRules.find(
        (rule) => rule.id === state.editingFirewallRuleId
      );

      if (editingRule) {
        await updateFirewallRule(
          zoneId,
          editingRule.id,
          buildFirewallUpdatePayload(editingRule, {
            ...state.firewallForm,
            filterId: editingRule.filterId || "",
            paused: Boolean(editingRule.paused),
          })
        );
        state.notice = "防火墙规则已更新";
      } else {
        await createFirewallRule(zoneId, state.firewallForm);
        state.notice = "防火墙规则已创建";
      }

      resetFirewallForm();
      await loadFirewallRules();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.savingFirewallRule = false;
      renderApp();
    }
  }

  async function deleteFirewallRule(ruleId) {
    const zoneId = readSelectedZoneId();
    const rule = state.firewallRules.find((item) => item.id === ruleId);

    if (!zoneId || !rule || state.deletingFirewallRuleId) {
      return;
    }

    const confirmed = window.confirm(`确定删除防火墙规则 ${rule.description || rule.id} 吗？`);

    if (!confirmed) {
      return;
    }

    state.deletingFirewallRuleId = ruleId;
    state.notice = "";
    renderApp();

    try {
      await removeFirewallRule(zoneId, ruleId);
      state.notice = "防火墙规则已删除";
      await loadFirewallRules();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.deletingFirewallRuleId = "";
      renderApp();
    }
  }

  async function toggleFirewallRule(ruleId) {
    const zoneId = readSelectedZoneId();
    const rule = state.firewallRules.find((item) => item.id === ruleId);

    if (!zoneId || !rule || state.updatingFirewallRuleId) {
      return;
    }

    const nextPaused = !rule.paused;
    state.updatingFirewallRuleId = ruleId;
    state.notice = "";
    renderApp();

    try {
      await updateFirewallRule(
        zoneId,
        ruleId,
        buildFirewallUpdatePayload(rule, { paused: nextPaused })
      );
      state.notice = nextPaused ? "防火墙规则已暂停" : "防火墙规则已启用";
      await loadFirewallRules();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.updatingFirewallRuleId = "";
      renderApp();
    }
  }

  function syncPageRuleExclusiveFields(event) {
    const form = {
      ...readPageRuleForm(),
      [event.target.name]: event.target.value,
    };

    if (form.forwardingType) {
      state.pageRuleForm = {
        ...form,
        cacheLevel: "",
        browserCacheTtl: "",
        securityLevel: "",
        ssl: "",
        alwaysUseHttps: "",
      };
    } else if (form.alwaysUseHttps === "on") {
      state.pageRuleForm = {
        ...form,
        cacheLevel: "",
        browserCacheTtl: "",
        securityLevel: "",
        ssl: "",
        forwardingType: "",
        forwardingUrl: "",
      };
    } else {
      state.pageRuleForm = form;
    }

    state.notice = "";
    renderApp();
  }

  function editPageRule(ruleId) {
    const rule = state.pageRules.find((item) => item.id === ruleId);

    if (!rule) {
      return;
    }

    state.pageRuleForm = readPageRulePayload(rule);
    state.editingPageRuleId = ruleId;
    state.notice = "编辑模式：表单已填充数据";
    renderApp();
    document.querySelector("#page-rule-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function resetPageRuleFormAction() {
    resetPageRuleForm();
    state.notice = "";
    renderApp();
  }

  async function savePageRule(event) {
    event.preventDefault();
    const zoneId = readSelectedZoneId();

    if (!zoneId || state.savingPageRule) {
      return;
    }

    state.pageRuleForm = readPageRuleForm();
    state.savingPageRule = true;
    state.notice = "";
    renderApp();

    try {
      if (state.editingPageRuleId) {
        await updatePageRule(zoneId, state.editingPageRuleId, state.pageRuleForm);
        state.notice = "页面规则已更新";
      } else {
        await createPageRule(zoneId, state.pageRuleForm);
        state.notice = "页面规则已创建";
      }

      resetPageRuleForm();
      await loadPageRules();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.savingPageRule = false;
      renderApp();
    }
  }

  async function togglePageRule(ruleId) {
    const zoneId = readSelectedZoneId();
    const rule = state.pageRules.find((item) => item.id === ruleId);

    if (!zoneId || !rule || state.updatingPageRuleId) {
      return;
    }

    const nextStatus = rule.status === "active" ? "disabled" : "active";
    state.updatingPageRuleId = ruleId;
    state.notice = "";
    renderApp();

    try {
      await updatePageRule(zoneId, ruleId, readPageRulePayload(rule, { status: nextStatus }));
      state.notice = nextStatus === "active" ? "页面规则已启用" : "页面规则已禁用";
      await loadPageRules();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.updatingPageRuleId = "";
      renderApp();
    }
  }

  async function deletePageRule(ruleId) {
    const zoneId = readSelectedZoneId();
    const rule = state.pageRules.find((item) => item.id === ruleId);

    if (!zoneId || !rule || state.deletingPageRuleId) {
      return;
    }

    const confirmed = window.confirm(`确定删除这条页面规则吗？\n${rule.urlPattern || rule.id}`);

    if (!confirmed) {
      return;
    }

    state.deletingPageRuleId = ruleId;
    state.notice = "";
    renderApp();

    try {
      await removePageRule(zoneId, ruleId);
      state.notice = "页面规则已删除";
      await loadPageRules();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.deletingPageRuleId = "";
      renderApp();
    }
  }

  async function deleteCustomCertificate(certificateId) {
    const zoneId = readSelectedZoneId();
    const certificate = state.customCertificates.find((item) => item.id === certificateId);

    if (!zoneId || !certificate || state.deletingCertificateId) {
      return;
    }

    const hosts = certificate.hosts?.join(", ") || certificate.id;
    const confirmed = window.confirm(`确定要删除此证书吗？\n${hosts}`);

    if (!confirmed) {
      return;
    }

    state.deletingCertificateId = certificateId;
    state.notice = "";
    renderApp();

    try {
      await removeCustomCertificate(zoneId, certificateId);
      state.notice = "证书已删除";
      await loadCertificates();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.deletingCertificateId = "";
      renderApp();
    }
  }

  return {
    deleteCustomCertificate,
    deleteFirewallRule,
    deletePageRule,
    editFirewallRule,
    editPageRule,
    loadCertificates,
    loadCacheSettings,
    loadFirewallRules,
    loadPageRules,
    purgeAllCache,
    purgeCacheByUrl,
    refreshZoneSettings,
    saveBrowserCacheTtl,
    saveCacheLevel,
    saveFirewallRule,
    savePageRule,
    resetPageRuleForm: resetPageRuleFormAction,
    resetFirewallRuleForm,
    syncPageRuleExclusiveFields,
    syncFirewallRuleType,
    toggleCacheSetting,
    toggleFirewallExamples,
    toggleFirewallRule,
    togglePageRule,
    useFirewallExample,
  };
}
