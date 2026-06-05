import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPagesStaticSite, versionUrl } from "../scripts/build-pages.js";

test("versions local static asset URLs for GitHub Pages deployments", async () => {
  assert.equal(versionUrl("./app.js", "sha-123"), "./app.js?v=sha-123");
  assert.equal(versionUrl("../api.js?old=1#hash", "sha-123"), "../api.js?v=sha-123#hash");
  assert.equal(versionUrl("/api/session/status", "sha-123"), "/api/session/status");
  assert.equal(versionUrl("https://example.com/app.js", "sha-123"), "https://example.com/app.js");
});

test("builds Pages output with versioned HTML, JS, CSS, and image references", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "cf-pages-build-"));

  try {
    const result = await buildPagesStaticSite({
      outputDir,
      version: "test-sha",
    });

    const indexHtml = await readFile(path.join(outputDir, "index.html"), "utf8");
    const appJs = await readFile(path.join(outputDir, "app.js"), "utf8");
    const mainJs = await readFile(path.join(outputDir, "js/main.js"), "utf8");
    const sessionActionsJs = await readFile(
      path.join(outputDir, "js/actions/session-actions.js"),
      "utf8"
    );
    const connectViewJs = await readFile(path.join(outputDir, "js/views/connect-view.js"), "utf8");
    const stylesCss = await readFile(path.join(outputDir, "styles.css"), "utf8");
    const componentsCss = await readFile(path.join(outputDir, "css/components.css"), "utf8");

    assert.equal(result.version, "test-sha");
    assert.equal(result.updatedFiles.includes("index.html"), true);
    assert.match(indexHtml, /href="\.\/styles\.css\?v=test-sha"/);
    assert.match(indexHtml, /src="\.\/app\.js\?v=test-sha"/);
    assert.match(indexHtml, /href="\.\/assets\/spider-icon\.png\?v=test-sha"/);
    assert.match(appJs, /import "\.\/js\/main\.js\?v=test-sha"/);
    assert.match(mainJs, /from "\.\/actions\.js\?v=test-sha"/);
    assert.match(sessionActionsJs, /from "\.\.\/api\.js\?v=test-sha"/);
    assert.match(connectViewJs, /src="assets\/spider-icon\.png\?v=test-sha"/);
    assert.match(stylesCss, /url\("\.\/css\/base\.css\?v=test-sha"\)/);
    assert.match(componentsCss, /url\("\.\/components\/panels\.css\?v=test-sha"\)/);
  } finally {
    await rm(outputDir, { force: true, recursive: true });
  }
});
