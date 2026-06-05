import { HttpError } from "../../lib/http-error.js";

const cloudflareIdPattern = /^[a-z0-9]{32}$/i;
const cloudflareResourceIdPattern = /^[a-z0-9_-]{1,128}$/i;

export function assertCloudflareId(value, label) {
  if (!cloudflareIdPattern.test(String(value || ""))) {
    throw new HttpError(400, `${label} 无效`);
  }
}

export function assertCloudflareResourceId(value, label) {
  if (!cloudflareResourceIdPattern.test(String(value || ""))) {
    throw new HttpError(400, `${label} 无效`);
  }
}
