import {
  createDeveloperResource,
  createWorker,
  fetchDeveloperResourceDetail,
  fetchDeveloperResources,
  fetchKvValue,
  fetchTunnelToken,
  putKvValue,
  putR2Object,
  queryD1Database,
  removeKvValue,
  removeR2Object,
  removeDeveloperResource,
  savePagesBuildConfig,
  saveTunnelConfiguration,
} from "../api.js";
import { state } from "../state.js";

const cloudflareResourceTypes = new Set(["pages", "d1", "r2", "kv", "tunnels"]);
const templatesStorageKey = "cloudflare-panel-worker-templates";

const builtinTemplateIds = new Set(["hello-world", "json-api", "cache-proxy"]);

function activeType() {
  return state.mainSection;
}

function activeAccountId() {
  return state.developerResourceAccountId || state.developerResourceAccounts[0]?.id || "";
}

function readForm(formId) {
  const form = document.querySelector(formId);
  return form ? new FormData(form) : new FormData();
}

function applyResourcePayload(payload = {}) {
  state.developerResourceType = payload.type || activeType();
  state.developerResourceAccountId = payload.accountId || state.developerResourceAccountId;
  state.developerResourceAccounts = payload.accounts || state.developerResourceAccounts;
  state.developerResourceItems = payload.items || [];
  state.developerResourceLoadedType = payload.type || activeType();
}

function resetResourceModal() {
  state.developerResourceModal = "";
  state.developerResourceDeleteId = "";
  state.developerResourceDeleteName = "";
  state.developerResourceDeleteConfirm = "";
  state.developerResourceSaving = false;
}

function clearResourceDetail() {
  state.developerResourceActiveId = "";
  state.developerResourceDetail = null;
  state.developerResourceDetailLoading = false;
  state.developerResourceDetailNotice = "";
  state.developerResourceTunnelToken = null;
}

function loadTemplatesFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(templatesStorageKey) || "[]");
    state.workerTemplates = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.workerTemplates = [];
  }
}

function saveTemplatesToStorage() {
  localStorage.setItem(templatesStorageKey, JSON.stringify(state.workerTemplates));
}

function allTemplates() {
  return [
    {
      id: "hello-world",
      name: "Hello World",
      script: `addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World!'));
});`,
    },
    {
      id: "json-api",
      name: "JSON API",
      script: `export default {
  async fetch() {
    return Response.json({ ok: true, message: 'Hello from Worker' });
  },
};`,
    },
    {
      id: "cache-proxy",
      name: "缓存反代",
      script: `export default {
  async fetch(request) {
    const response = await fetch(request, {
      cf: { cacheEverything: true, cacheTtl: 300 },
    });
    return new Response(response.body, response);
  },
};`,
    },
    ...state.workerTemplates,
  ];
}

export function createDeveloperResourcesActions({ renderApp }) {
  async function ensureDeveloperResourcesLoaded() {
    const type = activeType();

    if (state.view !== "domains") {
      return;
    }

    if (type === "templates") {
      loadTemplatesFromStorage();
      renderApp();
      return;
    }

    if (!cloudflareResourceTypes.has(type)) {
      return;
    }

    if (state.developerResourceLoadedType !== type || state.developerResourceType !== type) {
      await loadDeveloperResources();
    }
  }

  async function loadDeveloperResources() {
    const type = activeType();

    if (!cloudflareResourceTypes.has(type)) {
      return;
    }

    state.developerResourceType = type;
    state.developerResourceLoading = true;
    state.developerResourceNotice = "";
    renderApp();

    try {
      applyResourcePayload(await fetchDeveloperResources(type, activeAccountId()));
      clearResourceDetail();
    } catch (error) {
      state.developerResourceNotice = error.message;
    } finally {
      state.developerResourceLoading = false;
      renderApp();
    }
  }

  async function changeDeveloperResourceAccount(event) {
    state.developerResourceAccountId = String(event.target.value || "");
    state.developerResourceLoadedType = "";
    resetResourceModal();
    await loadDeveloperResources();
  }

  function openDeveloperResourceCreateModal() {
    state.developerResourceModal = "create";
    state.developerResourceNotice = "";
    renderApp();
  }

  function closeDeveloperResourceModal() {
    resetResourceModal();
    renderApp();
  }

  async function openDeveloperResourceDetail(resourceId) {
    const type = activeType();

    if (!resourceId || !cloudflareResourceTypes.has(type)) {
      return;
    }

    state.developerResourceActiveId = resourceId;
    state.developerResourceDetail = null;
    state.developerResourceDetailLoading = true;
    state.developerResourceDetailNotice = "";
    state.developerResourceTunnelToken = null;
    renderApp();

    try {
      state.developerResourceDetail = await fetchDeveloperResourceDetail(
        type,
        resourceId,
        activeAccountId()
      );
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
    } finally {
      state.developerResourceDetailLoading = false;
      renderApp();
    }
  }

  function closeDeveloperResourceDetail() {
    clearResourceDetail();
    renderApp();
  }

  async function submitPagesBuildConfig(event) {
    event.preventDefault();
    const formData = readForm("#pages-build-form");

    state.developerResourceDetailLoading = true;
    renderApp();

    try {
      await savePagesBuildConfig(state.developerResourceActiveId, {
        accountId: activeAccountId(),
        productionBranch: String(formData.get("productionBranch") || "").trim(),
        buildCommand: String(formData.get("buildCommand") || "").trim(),
        destinationDir: String(formData.get("destinationDir") || "").trim(),
        rootDir: String(formData.get("rootDir") || "").trim(),
      });
      state.developerResourceDetailNotice = "Pages 构建配置已保存";
      await openDeveloperResourceDetail(state.developerResourceActiveId);
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
    } finally {
      state.developerResourceDetailLoading = false;
      renderApp();
    }
  }

  async function submitD1Query(event) {
    event.preventDefault();
    const formData = readForm("#d1-query-form");
    state.developerResourceSqlDraft = String(formData.get("sql") || "").trim();
    state.developerResourceDetailLoading = true;
    renderApp();

    try {
      const result = await queryD1Database(state.developerResourceActiveId, {
        accountId: activeAccountId(),
        sql: state.developerResourceSqlDraft,
      });
      state.developerResourceDetail = {
        ...state.developerResourceDetail,
        extras: {
          ...(state.developerResourceDetail?.extras || {}),
          queryResults: result.results,
        },
      };
      state.developerResourceDetailNotice = "D1 查询已执行";
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
    } finally {
      state.developerResourceDetailLoading = false;
      renderApp();
    }
  }

  async function submitR2Object(event) {
    event.preventDefault();
    const formData = readForm("#r2-object-form");
    const key = String(formData.get("key") || "").trim();
    const content = String(formData.get("content") || "");
    state.developerResourceDetailLoading = true;
    renderApp();

    try {
      await putR2Object(state.developerResourceActiveId, {
        accountId: activeAccountId(),
        key,
        content,
        contentType: "text/plain; charset=utf-8",
      });
      state.developerResourceDetailNotice = "R2 对象已上传";
      await openDeveloperResourceDetail(state.developerResourceActiveId);
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
    } finally {
      state.developerResourceDetailLoading = false;
      renderApp();
    }
  }

  async function deleteR2Object(key) {
    if (!key || !window.confirm("确定删除这个 R2 对象吗？")) {
      return;
    }

    try {
      await removeR2Object(state.developerResourceActiveId, key, activeAccountId());
      state.developerResourceDetailNotice = "R2 对象已删除";
      await openDeveloperResourceDetail(state.developerResourceActiveId);
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
      renderApp();
    }
  }

  async function readKvValue(key) {
    if (!key) {
      return;
    }

    state.developerResourceKvKey = key;
    state.developerResourceDetailLoading = true;
    renderApp();

    try {
      const value = await fetchKvValue(state.developerResourceActiveId, key, activeAccountId());
      state.developerResourceKvValue = value.value || "";
      state.developerResourceDetailNotice = "KV Value 已读取";
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
    } finally {
      state.developerResourceDetailLoading = false;
      renderApp();
    }
  }

  async function submitKvValue(event) {
    event.preventDefault();
    const formData = readForm("#kv-value-form");
    const key = String(formData.get("key") || "").trim();
    const value = String(formData.get("value") || "");

    try {
      await putKvValue(state.developerResourceActiveId, {
        accountId: activeAccountId(),
        key,
        value,
      });
      state.developerResourceDetailNotice = "KV Value 已保存";
      await openDeveloperResourceDetail(state.developerResourceActiveId);
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
      renderApp();
    }
  }

  async function deleteKvValue(key) {
    if (!key || !window.confirm("确定删除这个 KV Key 吗？")) {
      return;
    }

    try {
      await removeKvValue(state.developerResourceActiveId, key, activeAccountId());
      state.developerResourceDetailNotice = "KV Key 已删除";
      await openDeveloperResourceDetail(state.developerResourceActiveId);
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
      renderApp();
    }
  }

  async function submitTunnelConfiguration(event) {
    event.preventDefault();
    const formData = readForm("#tunnel-config-form");

    try {
      const config = JSON.parse(String(formData.get("config") || "{}"));
      await saveTunnelConfiguration(state.developerResourceActiveId, {
        accountId: activeAccountId(),
        config,
      });
      state.developerResourceDetailNotice = "Tunnel 配置已保存";
      await openDeveloperResourceDetail(state.developerResourceActiveId);
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
      renderApp();
    }
  }

  async function loadTunnelToken() {
    state.developerResourceDetailLoading = true;
    renderApp();

    try {
      state.developerResourceTunnelToken = await fetchTunnelToken(
        state.developerResourceActiveId,
        activeAccountId()
      );
      state.developerResourceDetailNotice = "Tunnel Token 已读取";
    } catch (error) {
      state.developerResourceDetailNotice = error.message;
    } finally {
      state.developerResourceDetailLoading = false;
      renderApp();
    }
  }

  async function submitDeveloperResource(event) {
    event.preventDefault();
    const type = activeType();
    const formData = readForm("#devres-create-form");
    const request = {
      accountId: activeAccountId(),
      name: String(formData.get("name") || "").trim(),
      productionBranch: String(formData.get("productionBranch") || "").trim(),
      jurisdiction: String(formData.get("jurisdiction") || "").trim(),
      configSrc: String(formData.get("configSrc") || "").trim(),
    };

    if (!request.name) {
      state.developerResourceNotice = "请输入资源名称";
      renderApp();
      return;
    }

    state.developerResourceSaving = true;
    renderApp();

    try {
      await createDeveloperResource(type, request);
      resetResourceModal();
      await loadDeveloperResources();
      state.developerResourceNotice = "资源已创建";
    } catch (error) {
      state.developerResourceNotice = error.message;
    } finally {
      state.developerResourceSaving = false;
      renderApp();
    }
  }

  function requestDeleteDeveloperResource(resourceId, resourceName) {
    state.developerResourceModal = "delete";
    state.developerResourceDeleteId = resourceId || "";
    state.developerResourceDeleteName = resourceName || resourceId || "";
    state.developerResourceDeleteConfirm = "";
    state.developerResourceNotice = "";
    renderApp();
  }

  function updateDeveloperResourceDeleteConfirm(event) {
    state.developerResourceDeleteConfirm = String(event.target.value || "");
    const button = document.querySelector("#devres-delete-confirm");

    if (button) {
      button.disabled =
        state.developerResourceDeleteConfirm !== state.developerResourceDeleteName ||
        state.developerResourceSaving;
    }
  }

  async function confirmDeleteDeveloperResource() {
    if (state.developerResourceDeleteConfirm !== state.developerResourceDeleteName) {
      return;
    }

    const type = activeType();
    state.developerResourceSaving = true;
    renderApp();

    try {
      await removeDeveloperResource(
        type,
        state.developerResourceDeleteId,
        activeAccountId()
      );
      resetResourceModal();
      await loadDeveloperResources();
      state.developerResourceNotice = "资源已删除";
    } catch (error) {
      state.developerResourceNotice = error.message;
    } finally {
      state.developerResourceSaving = false;
      renderApp();
    }
  }

  function reloadWorkerTemplates() {
    loadTemplatesFromStorage();
    state.workerTemplateNotice = "模板库已重载";
    renderApp();
  }

  function openWorkerTemplateModal() {
    state.workerTemplateModal = "create";
    state.workerTemplateNotice = "";
    renderApp();
  }

  function closeWorkerTemplateModal() {
    state.workerTemplateModal = "";
    renderApp();
  }

  function submitWorkerTemplate(event) {
    event.preventDefault();
    const formData = readForm("#template-create-form");
    const name = String(formData.get("name") || "").trim();
    const script = String(formData.get("script") || "").trimEnd();

    if (!name || !script.trim()) {
      state.workerTemplateNotice = "模板名称和脚本内容不能为空";
      renderApp();
      return;
    }

    state.workerTemplates = [
      {
        id: `custom-${Date.now()}`,
        name,
        category: String(formData.get("category") || "自定义").trim() || "自定义",
        description: String(formData.get("description") || "").trim(),
        script,
        custom: true,
      },
      ...state.workerTemplates,
    ];
    saveTemplatesToStorage();
    state.workerTemplateModal = "";
    state.workerTemplateNotice = "模板已保存";
    renderApp();
  }

  function deleteWorkerTemplate(templateId) {
    if (!templateId || builtinTemplateIds.has(templateId)) {
      return;
    }

    if (!window.confirm("确定要删除这个模板吗？")) {
      return;
    }

    state.workerTemplates = state.workerTemplates.filter(
      (template) => template.id !== templateId
    );
    saveTemplatesToStorage();
    state.workerTemplateNotice = "模板已删除";
    renderApp();
  }

  async function useWorkerTemplate(templateId) {
    const template = allTemplates().find((item) => item.id === templateId);

    if (!template) {
      state.workerTemplateNotice = "模板不存在";
      renderApp();
      return;
    }

    state.mainSection = "workers";
    state.view = "domains";
    state.workersModal = "create";
    state.workersScript = template.script;
    state.workersNotice = `已载入模板：${template.name}`;
    renderApp();
  }

  async function createWorkerFromTemplate(templateId) {
    const template = allTemplates().find((item) => item.id === templateId);

    if (!template) {
      state.workerTemplateNotice = "模板不存在";
      renderApp();
      return;
    }

    const name = window.prompt("请输入 Worker 名称（小写字母、数字和连字符）");

    if (!name) {
      return;
    }

    state.workerTemplateNotice = "正在创建 Worker...";
    renderApp();

    try {
      await createWorker({ name: name.trim().toLowerCase(), script: template.script });
      state.workerTemplateNotice = `Worker "${name}" 已创建`;
    } catch (error) {
      state.workerTemplateNotice = error.message;
    } finally {
      renderApp();
    }
  }

  return {
    changeDeveloperResourceAccount,
    closeDeveloperResourceModal,
    closeDeveloperResourceDetail,
    closeWorkerTemplateModal,
    confirmDeleteDeveloperResource,
    createWorkerFromTemplate,
    deleteKvValue,
    deleteR2Object,
    deleteWorkerTemplate,
    ensureDeveloperResourcesLoaded,
    loadDeveloperResources,
    openDeveloperResourceCreateModal,
    openDeveloperResourceDetail,
    openWorkerTemplateModal,
    loadTunnelToken,
    readKvValue,
    reloadWorkerTemplates,
    requestDeleteDeveloperResource,
    submitDeveloperResource,
    submitD1Query,
    submitKvValue,
    submitPagesBuildConfig,
    submitR2Object,
    submitTunnelConfiguration,
    submitWorkerTemplate,
    updateDeveloperResourceDeleteConfirm,
    useWorkerTemplate,
  };
}
