import { createActions } from "./actions.js";
import { bindEvents } from "./events.js";
import { updateRoute } from "./router.js";
import { state } from "./state.js";
import { renderConnectView } from "./views/connect-view.js";
import { renderDomainsView } from "./views/domains-view.js";
import { renderFeatureView } from "./views/feature-view.js";
import { renderZoneView } from "./views/zone-view.js";

let actions;

function renderApp() {
  if (state.checkingSession || !state.connected) {
    renderConnectView();
    bindEvents(actions);
    return;
  }

  updateRoute();

  if (state.view === "zone") {
    renderZoneView();
  } else if (state.mainSection !== "domain") {
    renderFeatureView();
  } else {
    renderDomainsView();
  }

  bindEvents(actions);
}

actions = createActions({ renderApp });

window.addEventListener("hashchange", actions.handleRouteChange);

renderApp();
actions.checkSession();
