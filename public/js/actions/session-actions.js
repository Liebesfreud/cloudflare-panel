import {
  connectCloudflareAccount,
  fetchSessionStatus,
  logoutCloudflareAccount,
} from "../api.js";
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
      state.sessionExpiresAt = session.expiresAt || "";
      state.sessionSource = session.source || "";

      if (session.source === "cookie") {
        state.connected = true;
        await loadZones({ throwOnError: false });
      }
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
    const hasSuppliedCredentials = Boolean(credentials.email && credentials.globalApiKey);

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
      let session = await connectCloudflareAccount(credentials);

      if (hasSuppliedCredentials) {
        const verifiedSession = await fetchSessionStatus();

        if (verifiedSession.source !== "cookie") {
          throw new Error("浏览器未能保存登录 Cookie，请允许本站 Cookie 后重新登录。");
        }

        session = verifiedSession;
      }

      state.connected = true;
      state.sessionHasServerCredentials = Boolean(session.hasCredentials);
      state.sessionEmail = session.email || credentials.email;
      state.sessionExpiresAt = session.expiresAt || "";
      state.sessionSource = session.source || "";
      state.mainSection = "domain";
      await loadZones({ throwOnError: true });
    } catch (error) {
      if (hasSuppliedCredentials) {
        await logoutCloudflareAccount().catch(() => {});
      }

      state.connected = false;
      state.zoneError = "";
      state.sessionError = error.message;
    } finally {
      state.connectingSession = false;
      renderApp();
    }
  }

  async function logoutSession() {
    try {
      await logoutCloudflareAccount();
    } catch {
      // Local state should still be cleared if the network request fails.
    }

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
