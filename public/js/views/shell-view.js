import { githubIssueUrl, navItems, zoneNavItems } from "../constants.js";
import { icon } from "../icons.js";
import { state } from "../state.js";
import { escapeHtml, topbarTitle } from "../utils.js";

function renderNav() {
  return navItems
    .map(([id, iconName, label]) => {
      if (id === "needs") {
        return `
          <a class="nav-item" href="${githubIssueUrl}" target="_blank" rel="noreferrer">
            <span class="nav-icon">${icon(iconName)}</span>
            <span>${escapeHtml(label)}</span>
          </a>
        `;
      }

      return `
        <button class="nav-item ${id === state.mainSection ? "active" : ""}" type="button" data-main-section="${escapeHtml(id)}">
          <span class="nav-icon">${icon(iconName)}</span>
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    })
    .join("");
}

function renderZoneNav() {
  if (state.view !== "zone" || !state.selectedZone?.id) {
    return "";
  }

  return `
    <div class="zone-nav-block">
      <button class="zone-switcher" type="button" data-zone-section="dns">
        <span>${escapeHtml(state.selectedZone.name || "Loading")}</span>
        <span class="zone-switcher-icon">${icon("arrowLeft")}</span>
      </button>
      <nav class="zone-nav" aria-label="单域名管理">
        ${zoneNavItems
          .map(
            ([id, iconName, label]) => `
              <button class="zone-nav-item ${state.zoneSection === id ? "active" : ""}" type="button" data-zone-section="${escapeHtml(id)}">
                <span class="nav-icon">${icon(iconName)}</span>
                <span>${escapeHtml(label)}</span>
              </button>
            `
          )
          .join("")}
      </nav>
    </div>
  `;
}

export function renderShell(content) {
  const app = document.querySelector("#app");
  const accountLabel = state.sessionEmail || "Cloudflare Panel";
  app.className = "app-shell";
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-mark" src="assets/spider-icon.png" alt="Spider" />
        <div>
          <strong>蜘蛛网络</strong>
          <span>
            ${escapeHtml(accountLabel)}
            <em>${icon("arrowLeft")}</em>
          </span>
        </div>
      </div>

      <div class="nav-label">全局功能</div>
      <nav class="nav">${renderNav()}</nav>
      ${renderZoneNav()}
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div class="title-wrap">
          <span class="topbar-icon">${icon("layout")}</span>
          <h1>${escapeHtml(topbarTitle(state.view, state.zoneSection, state.mainSection))}</h1>
        </div>
        <button class="logout" type="button" id="logout-session">退出</button>
      </header>
      ${content}
    </main>
  `;
}
