import { state } from "../../state.js";
import { escapeHtml } from "../../utils.js";

export const defaultWorkerScript = `addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World!'));
});`;

export function activeAccountId() {
  return state.workersAccountId || state.workersAccounts[0]?.id || "";
}

export function activeWorkerName() {
  return state.workersActiveName || state.workersActiveDetail?.worker?.name || "";
}

export function activeRouteZoneId() {
  return state.workersRouteZoneId || state.zones[0]?.id || "";
}

export function activeDomainZoneId() {
  return state.workersDomainZoneId || state.zones[0]?.id || "";
}

export function findZone(zoneId) {
  return state.zones.find((zone) => zone.id === zoneId) || state.zones[0] || null;
}

export function accountName(accountId) {
  return state.workersAccounts.find((account) => account.id === accountId)?.name || accountId;
}

export function workerDomains(workerName) {
  return state.workersDomains.filter((domain) => domain.service === workerName);
}

export function renderAccountOptions() {
  return state.workersAccounts
    .map(
      (account) => `
        <option value="${escapeHtml(account.id)}" ${account.id === activeAccountId() ? "selected" : ""}>
          ${escapeHtml(account.name || account.id)}
        </option>
      `
    )
    .join("");
}

export function renderZoneOptions(selectedZoneId) {
  return state.zones
    .map(
      (zone) => `
        <option value="${escapeHtml(zone.id)}" ${zone.id === selectedZoneId ? "selected" : ""}>
          ${escapeHtml(zone.name)}
        </option>
      `
    )
    .join("");
}

export function renderWorkersNotice() {
  const messages = [
    state.workersNotice,
    ...(Array.isArray(state.workersWarnings) ? state.workersWarnings : []),
    ...(Array.isArray(state.workersActiveDetail?.warnings)
      ? state.workersActiveDetail.warnings
      : []),
  ].filter(Boolean);

  if (messages.length === 0) {
    return "";
  }

  return `
    <div class="workers-notice">
      ${messages.slice(0, 4).map((message) => `<p>${escapeHtml(message)}</p>`).join("")}
    </div>
  `;
}
