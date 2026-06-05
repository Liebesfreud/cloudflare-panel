import {
  createWorker,
  createWorkerDomain,
  createWorkerRoute,
  fetchWorker,
  createWorkerTail,
  fetchWorkerRoutes,
  fetchWorkers,
  removeWorkerSecret,
  removeWorker,
  removeWorkerDomain,
  removeWorkerRoute,
  saveWorkerScript,
  saveWorkerSecret,
  saveWorkerSettings,
  saveWorkerSchedules,
  saveWorkerSubdomain,
} from "../api.js";
import { state } from "../state.js";

const defaultWorkerScript = `addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World!'));
});`;

function firstZoneId() {
  return state.zones[0]?.id || "";
}

function zoneName(zoneId) {
  return state.zones.find((zone) => zone.id === zoneId)?.name || "";
}

function activeAccountId() {
  return state.workersAccountId || state.workersAccounts[0]?.id || "";
}

function activeWorkerName() {
  return state.workersActiveName || state.workersActiveDetail?.worker?.name || "";
}

function readForm(formId) {
  const form = document.querySelector(formId);
  return form ? new FormData(form) : new FormData();
}

function applyWorkersPayload(payload = {}) {
  state.workersAccountId = payload.accountId || state.workersAccountId;
  state.workersAccounts = payload.accounts || state.workersAccounts;
  state.workersList = payload.workers || [];
  state.workersDomains = payload.domains || [];
  state.workersWarnings = payload.warnings || [];
  state.workersLoaded = true;
}

function setNotice(message) {
  state.workersNotice = message;
}

function selectedRouteZoneId() {
  return state.workersRouteZoneId || firstZoneId();
}

function selectedDomainZoneId() {
  return state.workersDomainZoneId || firstZoneId();
}

function resetModalState() {
  state.workersModal = "";
  state.workersActiveName = "";
  state.workersActiveTab = "code";
  state.workersActiveDetail = null;
  state.workersScript = "";
  state.workersLoadingDetail = false;
  state.workersSaving = false;
  state.workersPendingKey = "";
  state.workersRoutes = [];
  state.workersRoutesLoading = false;
  state.workersDeleteName = "";
  state.workersDeleteConfirm = "";
}

function validateWorkerName(name) {
  if (!name) {
    return "请输入 Worker 名称";
  }

  if (!/^[a-z0-9-]+$/.test(name) || name.startsWith("-") || name.endsWith("-")) {
    return "Worker 名称只能包含小写字母、数字和连字符，且不能以连字符开头或结尾";
  }

  return "";
}

export function createWorkersActions({ renderApp }) {
  async function ensureWorkersLoaded() {
    if (state.mainSection !== "workers" || state.view !== "domains") {
      return;
    }

    if (!state.workersLoaded && !state.workersLoading) {
      await loadWorkers();
    }
  }

  async function loadWorkers() {
    state.workersLoading = true;
    state.workersNotice = "";
    renderApp();

    try {
      applyWorkersPayload(await fetchWorkers(activeAccountId()));
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersLoading = false;
      renderApp();
    }
  }

  async function changeWorkersAccount(event) {
    state.workersAccountId = String(event.target.value || "");
    state.workersLoaded = false;
    resetModalState();
    await loadWorkers();
  }

  function openCreateWorkerModal() {
    state.workersModal = "create";
    state.workersActiveName = "";
    state.workersActiveDetail = null;
    state.workersScript = defaultWorkerScript;
    state.workersNotice = "";
    renderApp();
  }

  function closeWorkersModal() {
    resetModalState();
    renderApp();
  }

  async function submitCreateWorker(event) {
    event.preventDefault();
    const formData = readForm("#worker-create-form");
    const name = String(formData.get("name") || "").trim().toLowerCase();
    const script = String(formData.get("script") || "").trimEnd();
    const nameError = validateWorkerName(name);

    if (nameError) {
      setNotice(nameError);
      renderApp();
      return;
    }

    if (!script.trim()) {
      setNotice("Worker 脚本代码不能为空");
      renderApp();
      return;
    }

    state.workersSaving = true;
    renderApp();

    try {
      await createWorker({ accountId: activeAccountId(), name, script });
      resetModalState();
      await loadWorkers();
      setNotice(`Worker "${name}" 创建成功。若 Cloudflare 显示“非活动”，表示未绑定到域，但已可通过 workers.dev 访问。`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersSaving = false;
      renderApp();
    }
  }

  async function openEditWorker(workerName, tab = "code") {
    if (!workerName) {
      return;
    }

    state.workersModal = "edit";
    state.workersActiveName = workerName;
    state.workersActiveTab = tab;
    state.workersActiveDetail = null;
    state.workersScript = "";
    state.workersLoadingDetail = true;
    state.workersRoutes = [];
    state.workersRouteZoneId = state.workersRouteZoneId || firstZoneId();
    state.workersDomainZoneId = state.workersDomainZoneId || firstZoneId();
    state.workersNotice = "";
    renderApp();

    try {
      state.workersActiveDetail = await fetchWorker(workerName, activeAccountId());
      state.workersScript = state.workersActiveDetail.script || "";
      if (state.workersActiveTab === "domain") {
        await loadWorkerRoutes({ render: false });
      }
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersLoadingDetail = false;
      renderApp();
    }
  }

  async function changeWorkerTab(event) {
    const tab = String(event.currentTarget.dataset.workerTab || "code");
    state.workersActiveTab = tab;
    renderApp();

    if (tab === "domain" && activeWorkerName() && state.workersRoutes.length === 0) {
      await loadWorkerRoutes();
    }
  }

  async function submitWorkerScript(event) {
    event.preventDefault();
    const script = String(readForm("#worker-editor-form").get("script") || "").trimEnd();

    if (!script.trim()) {
      setNotice("Worker 脚本代码不能为空");
      renderApp();
      return;
    }

    state.workersSaving = true;
    renderApp();

    try {
      const payload = await saveWorkerScript(activeWorkerName(), {
        accountId: activeAccountId(),
        script,
      });
      state.workersScript = script;
      await loadWorkers();
      setNotice(`Worker "${payload.worker?.name || activeWorkerName()}" 已保存并部署`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersSaving = false;
      renderApp();
    }
  }

  async function toggleWorkerSubdomain(event) {
    const enabled = event.currentTarget.checked;

    state.workersPendingKey = "subdomain";
    renderApp();

    try {
      const payload = await saveWorkerSubdomain(activeWorkerName(), {
        accountId: activeAccountId(),
        enabled,
        previewsEnabled: enabled,
      });
      state.workersActiveDetail = {
        ...state.workersActiveDetail,
        subdomain: payload.subdomain,
      };
      setNotice(enabled ? "workers.dev 子域已启用" : "workers.dev 子域已禁用");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function loadWorkerRoutes({ render = true } = {}) {
    const zoneId = selectedRouteZoneId();

    if (!activeWorkerName() || !zoneId) {
      state.workersRoutes = [];
      return;
    }

    state.workersRoutesLoading = true;
    if (render) {
      renderApp();
    }

    try {
      state.workersRoutes = await fetchWorkerRoutes(activeWorkerName(), zoneId);
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersRoutesLoading = false;
      if (render) {
        renderApp();
      }
    }
  }

  async function changeWorkerRouteZone(event) {
    state.workersRouteZoneId = String(event.target.value || "");
    await loadWorkerRoutes();
  }

  function changeWorkerDomainZone(event) {
    state.workersDomainZoneId = String(event.target.value || "");
    renderApp();
  }

  async function submitWorkerBinding(event) {
    event.preventDefault();
    const formData = readForm("#worker-binding-form");
    const type = String(formData.get("type") || "plain_text");
    const name = String(formData.get("name") || "").trim().toUpperCase();
    const value = String(formData.get("value") || "").trim();
    const currentBindings = state.workersActiveDetail?.settings?.bindings || [];
    const binding = {
      type,
      name,
      text: value,
      namespaceId: value,
      databaseId: value,
      bucketName: value,
      queueName: value,
      service: value,
    };

    state.workersPendingKey = "binding";
    renderApp();

    try {
      const payload = await saveWorkerSettings(activeWorkerName(), {
        accountId: activeAccountId(),
        bindings: [binding, ...currentBindings.filter((item) => item.name !== name)],
      });
      state.workersActiveDetail = {
        ...state.workersActiveDetail,
        settings: payload.settings,
      };
      setNotice("Worker 绑定已保存");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function submitWorkerSecret(event) {
    event.preventDefault();
    const formData = readForm("#worker-secret-form");
    const name = String(formData.get("name") || "").trim().toUpperCase();
    const value = String(formData.get("value") || "");

    state.workersPendingKey = "secret";
    renderApp();

    try {
      const secret = await saveWorkerSecret(activeWorkerName(), {
        accountId: activeAccountId(),
        name,
        value,
      });
      state.workersActiveDetail = {
        ...state.workersActiveDetail,
        secrets: [secret, ...(state.workersActiveDetail?.secrets || []).filter((item) => item.name !== name)],
      };
      setNotice("Worker Secret 已保存");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function deleteWorkerSecret(secretName) {
    if (!secretName || !window.confirm("确定删除这个 Secret 吗？")) {
      return;
    }

    state.workersPendingKey = "secret";
    renderApp();

    try {
      await removeWorkerSecret(activeWorkerName(), secretName, activeAccountId());
      state.workersActiveDetail = {
        ...state.workersActiveDetail,
        secrets: (state.workersActiveDetail?.secrets || []).filter(
          (secret) => secret.name !== secretName
        ),
      };
      setNotice("Worker Secret 已删除");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function submitWorkerSchedules(event) {
    event.preventDefault();
    const formData = readForm("#worker-cron-form");
    const schedules = String(formData.get("schedules") || "")
      .split(/\n+/)
      .map((cron) => cron.trim())
      .filter(Boolean);

    state.workersPendingKey = "cron";
    renderApp();

    try {
      const payload = await saveWorkerSchedules(activeWorkerName(), {
        accountId: activeAccountId(),
        schedules,
      });
      state.workersActiveDetail = {
        ...state.workersActiveDetail,
        schedules: payload.schedules,
      };
      setNotice("Cron Triggers 已保存");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function openWorkerTail() {
    state.workersPendingKey = "tail";
    renderApp();

    try {
      state.workersTailInfo = await createWorkerTail(activeWorkerName(), activeAccountId());
      setNotice("Worker Tail 会话已创建");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function submitWorkerRoute(event) {
    event.preventDefault();
    const formData = readForm("#worker-route-form");
    const zoneId = String(formData.get("zoneId") || selectedRouteZoneId());
    const pattern = String(formData.get("pattern") || "").trim();

    if (!pattern) {
      setNotice("路由模式不能为空");
      renderApp();
      return;
    }

    state.workersPendingKey = "route";
    renderApp();

    try {
      await createWorkerRoute(activeWorkerName(), {
        zoneId,
        zoneName: zoneName(zoneId),
        pattern,
      });
      setNotice("路由已添加");
      await loadWorkerRoutes({ render: false });
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function deleteWorkerRoute(routeId) {
    if (!routeId || !window.confirm("确定要删除这个路由吗？")) {
      return;
    }

    state.workersPendingKey = "route";
    renderApp();

    try {
      await removeWorkerRoute(activeWorkerName(), routeId, selectedRouteZoneId());
      state.workersRoutes = state.workersRoutes.filter((route) => route.id !== routeId);
      setNotice("路由已删除");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function submitWorkerDomain(event) {
    event.preventDefault();
    const formData = readForm("#worker-domain-form");
    const zoneId = String(formData.get("zoneId") || selectedDomainZoneId());
    const hostname = String(formData.get("hostname") || "").trim();

    if (!hostname) {
      setNotice("自定义域不能为空");
      renderApp();
      return;
    }

    state.workersPendingKey = "domain";
    renderApp();

    try {
      const domain = await createWorkerDomain(activeWorkerName(), {
        accountId: activeAccountId(),
        zoneId,
        zoneName: zoneName(zoneId),
        hostname,
      });
      state.workersActiveDetail = {
        ...state.workersActiveDetail,
        domains: [domain, ...(state.workersActiveDetail?.domains || [])],
      };
      await loadWorkers();
      setNotice("自定义域已添加");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  async function deleteWorkerDomain(domainId) {
    if (!domainId || !window.confirm("确定要删除这个自定义域吗？")) {
      return;
    }

    state.workersPendingKey = "domain";
    renderApp();

    try {
      await removeWorkerDomain(activeWorkerName(), domainId, activeAccountId());
      state.workersActiveDetail = {
        ...state.workersActiveDetail,
        domains: (state.workersActiveDetail?.domains || []).filter(
          (domain) => domain.id !== domainId
        ),
      };
      await loadWorkers();
      setNotice("自定义域已删除");
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersPendingKey = "";
      renderApp();
    }
  }

  function requestDeleteWorker(workerName) {
    state.workersModal = "delete";
    state.workersDeleteName = workerName;
    state.workersDeleteConfirm = "";
    state.workersNotice = "";
    renderApp();
  }

  function updateWorkerDeleteConfirm(event) {
    state.workersDeleteConfirm = String(event.target.value || "");
    const button = document.querySelector("#worker-delete-confirm");

    if (button) {
      button.disabled =
        state.workersDeleteConfirm !== state.workersDeleteName || state.workersSaving;
    }
  }

  async function confirmDeleteWorker() {
    if (state.workersDeleteConfirm !== state.workersDeleteName) {
      return;
    }

    state.workersSaving = true;
    renderApp();

    try {
      await removeWorker(state.workersDeleteName, activeAccountId());
      const deletedName = state.workersDeleteName;
      resetModalState();
      await loadWorkers();
      setNotice(`Worker "${deletedName}" 已删除`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      state.workersSaving = false;
      renderApp();
    }
  }

  return {
    changeWorkerDomainZone,
    changeWorkerRouteZone,
    changeWorkersAccount,
    changeWorkerTab,
    closeWorkersModal,
    confirmDeleteWorker,
    deleteWorkerSecret,
    deleteWorkerDomain,
    deleteWorkerRoute,
    ensureWorkersLoaded,
    loadWorkerRoutes,
    loadWorkers,
    openCreateWorkerModal,
    openEditWorker,
    requestDeleteWorker,
    submitCreateWorker,
    submitWorkerDomain,
    submitWorkerBinding,
    submitWorkerSecret,
    submitWorkerSchedules,
    submitWorkerRoute,
    submitWorkerScript,
    openWorkerTail,
    toggleWorkerSubdomain,
    updateWorkerDeleteConfirm,
  };
}
