import { proxiableTypes } from "../constants.js";
import { state } from "../state.js";

export function collectDnsForm() {
  const form = document.querySelector("#dns-record-form");
  const formData = new FormData(form);
  const type = String(formData.get("type") || "A").toUpperCase();

  return {
    id: state.dnsForm.id,
    type,
    name: String(formData.get("name") || "").trim(),
    content: String(formData.get("content") || "").trim(),
    ttl: Number(formData.get("ttl") || 1),
    priority: String(formData.get("priority") || "").trim(),
    proxied: Boolean(formData.get("proxied")) && proxiableTypes.has(type),
    comment: String(formData.get("comment") || "").trim(),
  };
}

export function fillDnsFormFromRecord(record) {
  state.dnsForm = {
    id: record.id,
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: String(record.ttl || 1),
    priority: record.priority === null ? "" : String(record.priority),
    proxied: Boolean(record.proxied),
    comment: record.comment || "",
  };
}
