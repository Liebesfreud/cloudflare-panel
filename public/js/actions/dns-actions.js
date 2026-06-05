import {
  createDnsRecord,
  fetchDnsRecords,
  removeDnsRecord,
  updateDnsRecord,
} from "../api.js";
import { proxiableTypes } from "../constants.js";
import { collectDnsForm, fillDnsFormFromRecord } from "../forms/dns-form.js";
import { resetDnsForm, state } from "../state.js";

export function createDnsActions({ renderApp }) {
  async function loadDnsRecords() {
    if (!state.selectedZone?.id) {
      return;
    }

    state.loadingDns = true;
    state.dnsError = "";
    renderApp();

    try {
      state.dnsRecords = await fetchDnsRecords(state.selectedZone.id);
    } catch (error) {
      state.dnsError = error.message;
    } finally {
      state.loadingDns = false;
      renderApp();
    }
  }

  function resetDnsFormAction() {
    const keepCreateFormOpen = state.dnsFormOpen && !state.dnsForm.id;
    resetDnsForm();
    state.dnsFormOpen = keepCreateFormOpen;
    state.notice = "";
    renderApp();
  }

  function openCreateDnsForm() {
    resetDnsForm();
    state.dnsFormOpen = true;
    state.notice = "";
    renderApp();
    document.querySelector("#dns-record-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function syncDnsFormType(event) {
    state.dnsForm = collectDnsForm();
    state.dnsForm.type = event.target.value;

    if (!proxiableTypes.has(state.dnsForm.type)) {
      state.dnsForm.proxied = false;
    }

    renderApp();
  }

  async function saveDnsRecord(event) {
    event.preventDefault();

    if (!state.selectedZone?.id) {
      return;
    }

    const record = collectDnsForm();
    const isEdit = Boolean(record.id);
    state.dnsForm = { ...record, ttl: String(record.ttl) };
    state.savingDns = true;
    state.notice = "";
    renderApp();

    try {
      if (isEdit) {
        await updateDnsRecord(state.selectedZone.id, record.id, record);
      } else {
        await createDnsRecord(state.selectedZone.id, record);
      }

      resetDnsForm();
      state.notice = isEdit ? "DNS 记录已更新" : "DNS 记录已添加";
      await loadDnsRecords();
    } catch (error) {
      state.notice = error.message;
    } finally {
      state.savingDns = false;
      renderApp();
    }
  }

  function editDnsRecord(recordId) {
    const record = state.dnsRecords.find((item) => item.id === recordId);

    if (!record) {
      return;
    }

    fillDnsFormFromRecord(record);
    state.dnsFormOpen = true;
    state.notice = "";
    renderApp();
    document.querySelector("#dns-record-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function deleteDnsRecord(recordId) {
    const record = state.dnsRecords.find((item) => item.id === recordId);

    if (!record || !state.selectedZone?.id) {
      return;
    }

    const confirmed = window.confirm(`确定删除 ${record.type} ${record.name} 吗？`);

    if (!confirmed) {
      return;
    }

    try {
      await removeDnsRecord(state.selectedZone.id, record.id);
      state.notice = "DNS 记录已删除";
      await loadDnsRecords();
    } catch (error) {
      state.notice = error.message;
      renderApp();
    }
  }

  return {
    deleteDnsRecord,
    editDnsRecord,
    loadDnsRecords,
    openCreateDnsForm,
    resetDnsForm: resetDnsFormAction,
    saveDnsRecord,
    syncDnsFormType,
  };
}
