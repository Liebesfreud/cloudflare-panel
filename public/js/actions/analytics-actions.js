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
      state.analytics = await fetchZoneAnalytics(zoneId, {
        days: rangeDays[state.analyticsRange],
        startDate: state.analyticsStartDate,
        endDate: state.analyticsEndDate,
      });
    } catch (error) {
      state.analyticsError = error.message;
    } finally {
      state.loadingAnalytics = false;
      renderApp();
    }
  }

  async function changeAnalyticsRange(range) {
    state.analyticsStartDate = "";
    state.analyticsEndDate = "";
    await loadZoneAnalytics(range);
  }

  async function submitAnalyticsRange(event) {
    event.preventDefault();
    const form = document.querySelector("#analytics-range-form");
    const formData = form ? new FormData(form) : new FormData();
    state.analyticsRange = "custom";
    state.analyticsStartDate = String(formData.get("startDate") || "").trim();
    state.analyticsEndDate = String(formData.get("endDate") || "").trim();
    await loadZoneAnalytics("custom");
  }

  return {
    changeAnalyticsRange,
    loadZoneAnalytics,
    submitAnalyticsRange,
  };
}
