import { fetchZones } from "../api.js";
import { routeToZone, updateRoute } from "../router.js";
import { state } from "../state.js";

export function createDomainActions({ loadZoneSectionData, renderApp, showNotice }) {
  async function loadZones({ throwOnError = false } = {}) {
    state.loadingZones = true;
    state.zoneError = "";
    renderApp();

    try {
      state.zones = await fetchZones();
      updateRoute();

      if (state.view === "zone") {
        state.selectedZone =
          state.zones.find((zone) => zone.id === state.selectedZone?.id) || state.selectedZone;

        await loadZoneSectionData();
      }
    } catch (error) {
      state.zoneError = error.message;

      if (throwOnError) {
        throw error;
      }
    } finally {
      state.loadingZones = false;
      renderApp();
    }
  }

  function addDomain(event) {
    event.preventDefault();
    const input = document.querySelector("#domain-input");
    const domain = input.value.trim().toLowerCase();

    if (!domain) {
      showNotice("请输入要添加的域名");
      return;
    }

    showNotice("添加域名功能待接入，当前版本先只读取账号域名列表");
  }

  function openMainSection(section) {
    state.mainSection = section || "domain";
    state.view = "domains";
    state.selectedZone = null;

    if (location.hash) {
      history.replaceState(null, "", location.pathname);
    }

    renderApp();
  }

  function openZone(zoneId) {
    const zone = state.zones.find((item) => item.id === zoneId);

    if (zone) {
      routeToZone(zone);
    }
  }

  async function copyToClipboard(event, value) {
    event.stopPropagation();
    await navigator.clipboard.writeText(value);
    showNotice("已复制到剪贴板");
  }

  return {
    addDomain,
    copyToClipboard,
    loadZones,
    openMainSection,
    openZone,
  };
}
