import { connectCloudflareAccount, fetchSessionStatus } from "../api.js";
import { resetSessionState, state } from "../state.js";

function readConnectForm() {
  const form = document.querySelector("#cloudflare-connect-form");

  if (!form) {
    return { email: "", globalApiKey: "" };
  }

  const formData = new FormData(form);

  return {
    email: String(formData.get("email") || "").trim(),
    globalApiKey: String(formData.get("globalApiKey") || "").trim(),
  };
}

export function createSessionActions({ loadZones, renderApp }) {
  async function checkSession() {
    state.checkingSession = true;
    state.sessionError = "";
    renderApp();

    try {
      const session = await fetchSessionStatus();
      state.sessionHasServerCredentials = Boolean(session.hasCredentials);
      state.sessionEmail = session.email || "";
    } catch (error) {
      state.sessionError = error.message;
    } finally {
      state.checkingSession = false;
      renderApp();
    }
  }

  async function connectSession(event) {
    event?.preventDefault();

    const credentials = readConnectForm();

    if (
      !state.sessionHasServerCredentials &&
      (!credentials.email || !credentials.globalApiKey)
    ) {
      state.sessionError = "请输入 Cloudflare 账号邮箱和 Global API Key。";
      renderApp();
      return;
    }

    state.connectingSession = true;
    state.sessionError = "";
    renderApp();

    try {
      const session = await connectCloudflareAccount(credentials);
      state.connected = true;
      state.sessionHasServerCredentials = Boolean(session.hasCredentials);
      state.sessionEmail = session.email || credentials.email;
      state.mainSection = "domain";
      await loadZones({ throwOnError: true });
    } catch (error) {
      state.connected = false;
      state.zoneError = "";
      state.sessionError = error.message;
    } finally {
      state.connectingSession = false;
      renderApp();
    }
  }

  function logoutSession() {
    resetSessionState();
    history.replaceState(null, "", location.pathname);
    renderApp();
  }

  return {
    checkSession,
    connectSession,
    logoutSession,
  };
}
