import { navFeatureMeta, navItems } from "../constants.js";
import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";
import { renderAutomationView } from "./automation-view.js";
import { renderDeveloperResourcesView } from "./developer-resources-view.js";
import { renderShell } from "./shell-view.js";
import { renderSpeedView } from "./speed-view.js";
import { renderWorkersView } from "./workers-view.js";

function currentFeature() {
  const meta = navFeatureMeta[state.mainSection] || navFeatureMeta.speed;
  const nav = navItems.find(([id]) => id === state.mainSection);

  return {
    iconName: nav?.[1] || "grid",
    label: nav?.[2] || meta.title,
    ...meta,
  };
}

export function renderFeatureView() {
  if (state.mainSection === "speed") {
    renderSpeedView();
    return;
  }

  if (state.mainSection === "automation") {
    renderAutomationView();
    return;
  }

  if (state.mainSection === "workers") {
    renderWorkersView();
    return;
  }

  if (["pages", "d1", "r2", "kv", "templates", "tunnels"].includes(state.mainSection)) {
    renderDeveloperResourcesView();
    return;
  }

  const feature = currentFeature();

  renderShell(`
    <section class="content feature-content">
      <section class="panel feature-hero-panel">
        <div>
          <span class="feature-badge">${escapeHtml(feature.badge)}</span>
          <h2>${escapeHtml(feature.title)}</h2>
          <p>${escapeHtml(feature.description)}</p>
        </div>
        <span class="feature-hero-icon">${icon(feature.iconName)}</span>
      </section>

      <section class="panel feature-shell-panel">
        <div class="panel-title">
          <span class="panel-title-icon">${icon(feature.iconName)}</span>
          <h2>${escapeHtml(feature.label)}</h2>
        </div>
        <div class="feature-field-grid">
          ${feature.fields
            .map(
              (field) => `
                <div class="feature-field-card">
                  <span>${escapeHtml(field)}</span>
                  <strong>待接入</strong>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="notice">此模块当前为仿站后台壳子，真实 Cloudflare 写接口会按功能逐步接入。</div>
      </section>
    </section>
  `);
}
