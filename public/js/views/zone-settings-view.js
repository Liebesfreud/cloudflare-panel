import { renderAnalyticsSettingsView } from "./zone/analytics-view.js";
import { renderCacheSettingsView } from "./zone/cache-view.js";
import { renderCertificatesSettingsView } from "./zone/certificates-view.js";
import { renderFirewallSettingsView } from "./zone/firewall-view.js";
import { renderPageRulesSettingsView } from "./zone/page-rules-view.js";
import { renderStaticSettingsView } from "./zone/static-settings-view.js";

export function renderZoneSettingsView(section) {
  if (section === "analytics") {
    return renderAnalyticsSettingsView();
  }

  if (section === "cache") {
    return renderCacheSettingsView();
  }

  if (section === "firewall") {
    return renderFirewallSettingsView();
  }

  if (section === "rules") {
    return renderPageRulesSettingsView();
  }

  if (section === "certificates") {
    return renderCertificatesSettingsView();
  }

  return renderStaticSettingsView(section);
}
