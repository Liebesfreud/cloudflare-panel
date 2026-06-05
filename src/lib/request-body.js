import { HttpError } from "./http-error.js";

const defaultMaxJsonBodyBytes = 64 * 1024;

export async function readJsonBody(request, { maxBytes = defaultMaxJsonBodyBytes } = {}) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.byteLength;

    if (totalBytes > maxBytes) {
      throw new HttpError(413, "请求体过大");
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "请求体不是有效的 JSON");
  }
}
