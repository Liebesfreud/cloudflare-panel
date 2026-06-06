import { securityHeaders } from "./security-headers.js";

export function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    ...securityHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}
