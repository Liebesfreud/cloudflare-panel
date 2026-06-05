import { state } from "../state.js";
import { renderDnsView } from "./dns-view.js";
import { renderShell } from "./shell-view.js";
import { renderZoneSettingsView } from "./zone-settings-view.js";

function renderZoneContent() {
  if (state.zoneSection === "dns") {
    return renderDnsView();
  }

  return renderZoneSettingsView(state.zoneSection);
}

export function renderZoneView() {
  renderShell(`
    <section class="content zone-content-page">
      ${renderZoneContent()}
    </section>
  `);
}
