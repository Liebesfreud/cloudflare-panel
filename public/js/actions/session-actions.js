import {
  ApiUnavailableError,
  fetchSessionStatus,
  loginPanel,
  logoutCloudflareAccount,
  switchCloudflareAccount,
} from "../api.js";
import { resetCloudflareAccountData, resetSessionState, state } from "../state.js";

function readConnectForm() {
  const form = document.querySelector("#cloudflare-connect-form");

  if (!form) {
    return { auth: "", password: "", user: "" };
  }

  const formData = new FormData(form);

  return {
    auth: String(formData.get("auth") || "").trim(),
    cloudflareAccountId: String(formData.get("cloudflareAccountId") || "").trim(),
    password: String(formData.get("password") || "").trim(),
    user: String(formData.get("user") || "").trim(),
  };
}

function applySession(session) {
  state.sessionAuthenticated = Boolean(session.authenticated);
  state.sessionHasServerCredentials = Boolean(session.hasCredentials);
  state.loginRequired = Boolean(session.loginRequired);
  state.cloudflareAccounts = Array.isArray(session.accounts) ? session.accounts : [];
  state.activeCloudflareAccount = session.activeCloudflareAccount || null;
  state.activeCloudflareAccountId = session.activeCloudflareAccount?.id || "";
  state.sessionEmail = session.email || session.activeCloudflareAccount?.email || "";
  state.sessionExpiresAt = session.expiresAt || "";
  state.sessionSource = session.source || "";
}

export function createSessionActions({ loadZones, renderApp }) {
  async function checkSession() {
    state.checkingSession = true;
    state.sessionError = "";
    renderApp();

    try {
      const session = await fetchSessionStatus();
      applySession(session);

      if (session.authenticated || (session.hasCredentials && !session.loginRequired)) {
        state.connected = true;
        await loadZones({ throwOnError: false });
      }
    } catch (error) {
      if (!(error instanceof ApiUnavailableError)) {
        state.sessionError = error.message;
      }
    } finally {
      state.checkingSession = false;
      renderApp();
    }
  }

  async function connectSession(event) {
    event?.preventDefault();

    const credentials = readConnectForm();

    if (!credentials.user || !credentials.password || !credentials.auth) {
      state.sessionError = "请输入用户名、密码和 2FA 验证码。";
      renderApp();
      return;
    }

    state.connectingSession = true;
    state.sessionError = "";
    renderApp();

    try {
      await loginPanel(credentials);
      const session = await fetchSessionStatus();

      if (!session.authenticated) {
        throw new Error("浏览器未能保存登录 Cookie，请允许本站 Cookie 后重新登录。");
      }

      state.connected = true;
      applySession(session);
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

  async function changeCloudflareAccount(event) {
    const accountId = String(event?.target?.value || "").trim();

    if (!accountId || accountId === state.activeCloudflareAccountId) {
      return;
    }

    state.selectingCloudflareAccount = true;
    state.sessionError = "";
    renderApp();

    try {
      const session = await switchCloudflareAccount(accountId);
      applySession(session);
      resetCloudflareAccountData();
      state.connected = true;
      await loadZones({ throwOnError: true });
    } catch (error) {
      state.sessionError = error.message;
    } finally {
      state.selectingCloudflareAccount = false;
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
    changeCloudflareAccount,
    checkSession,
    connectSession,
    logoutSession,
  };
}
