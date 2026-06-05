import { fetchZoneAnalytics } from "../api.js";
import { state } from "../state.js";

const rangeDays = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

function readSelectedZoneId() {
  return state.selectedZone?.id || "";
}

export function createAnalyticsActions({ renderApp }) {
  async function loadZoneAnalytics(range = state.analyticsRange || "7d") {
    const zoneId = readSelectedZoneId();

    if (!zoneId) {
      return;
    }

    state.analyticsRange = rangeDays[range] ? range : "7d";
    state.loadingAnalytics = true;
    state.analyticsError = "";
    state.analytics = null;
    renderApp();

    try {
      state.analytics = await fetchZoneAnalytics(zoneId, rangeDays[state.analyticsRange]);
    } catch (error) {
      state.analyticsError = error.message;
    } finally {
      state.loadingAnalytics = false;
      renderApp();
    }
  }

  async function changeAnalyticsRange(range) {
    await loadZoneAnalytics(range);
  }

  return {
    changeAnalyticsRange,
    loadZoneAnalytics,
  };
}
