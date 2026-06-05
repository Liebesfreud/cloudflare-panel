import { navItems, recordTypeHints, statusText, zoneSectionTitles } from "./constants.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function statusLabel(status) {
  return statusText[status] || status || "未知";
}

export function planLabel(zone) {
  return (zone.plan?.name || "Unknown").replace(/ Website$/i, "");
}

export function ttlLabel(ttl) {
  return Number(ttl) === 1 ? "自动" : `${ttl}s`;
}

export function getTypeHint(type) {
  return recordTypeHints[type] || recordTypeHints.A;
}

export function topbarTitle(view, section = "dns", mainSection = "domain") {
  if (view === "zone") {
    return sectionTitle(section);
  }

  const activeNav = navItems.find(([id]) => id === mainSection);
  return activeNav?.[2] || "域名管理";
}

export function sectionTitle(section) {
  return zoneSectionTitles[section] || "域名管理";
}
