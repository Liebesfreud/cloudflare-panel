import { clearOperationHistory, fetchOperationHistory } from "../api.js";
import { state } from "../state.js";

function historyQuery() {
  return {
    limit: state.operationHistoryLimit,
    module: state.operationHistoryModule,
    status: state.operationHistoryStatus,
  };
}

function applyHistoryPayload(payload = {}) {
  state.operationHistory = Array.isArray(payload.entries) ? payload.entries : [];
  state.operationHistoryFilters = {
    modules: Array.isArray(payload.filters?.modules) ? payload.filters.modules : [],
    statuses: Array.isArray(payload.filters?.statuses) ? payload.filters.statuses : [],
  };
}

export function createHistoryActions({ renderApp }) {
  async function loadOperationHistory() {
    state.operationHistoryLoading = true;
    state.operationHistoryNotice = "";
    renderApp();

    try {
      applyHistoryPayload(await fetchOperationHistory(historyQuery()));
    } catch (error) {
      state.operationHistoryNotice = error.message;
    } finally {
      state.operationHistoryLoading = false;
      renderApp();
    }
  }

  async function ensureOperationHistoryLoaded() {
    if (state.view !== "domains" || state.mainSection !== "history") {
      return;
    }

    await loadOperationHistory();
  }

  async function changeOperationHistoryFilter(event) {
    const field = event.target.dataset.historyFilter;
    const value = String(event.target.value || "");

    if (field === "module") {
      state.operationHistoryModule = value;
    } else if (field === "status") {
      state.operationHistoryStatus = value;
    } else if (field === "limit") {
      state.operationHistoryLimit = value;
    }

    await loadOperationHistory();
  }

  async function clearOperationHistoryAction() {
    state.operationHistoryLoading = true;
    state.operationHistoryNotice = "";
    renderApp();

    try {
      const result = await clearOperationHistory();
      state.operationHistoryNotice = `已清空 ${result.deleted || 0} 条操作记录`;
      applyHistoryPayload(await fetchOperationHistory(historyQuery()));
    } catch (error) {
      state.operationHistoryNotice = error.message;
    } finally {
      state.operationHistoryLoading = false;
      renderApp();
    }
  }

  return {
    changeOperationHistoryFilter,
    clearOperationHistory: clearOperationHistoryAction,
    ensureOperationHistoryLoaded,
    loadOperationHistory,
  };
}
