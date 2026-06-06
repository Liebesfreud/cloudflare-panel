import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import { publicDir } from "../config/paths.js";
import { securityHeaders } from "../lib/security-headers.js";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
]);

function resolvePublicFile(pathname) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(requestPath);
  const relativePath = decodedPath.replace(/^[/\\]+/, "");
  const filePath = resolve(publicDir, relativePath);
  const publicRoot = resolve(publicDir);

  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) {
    return null;
  }

  return filePath;
}

export async function serveStaticFile(url, response) {
  const filePath = resolvePublicFile(url.pathname);

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      ...securityHeaders(),
      "Content-Type": mimeTypes.get(extname(filePath)) || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  } catch {
    const fallback = await readFile(resolve(publicDir, "index.html"));
    response.writeHead(200, {
      ...securityHeaders(),
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(fallback);
  }
}
