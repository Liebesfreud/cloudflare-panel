import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionedExtensions = /\.(?:css|gif|ico|jpeg|jpg|js|png|svg|webp)$/i;

function normalizeVersion(version) {
  const cleaned = String(version || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (cleaned) {
    return cleaned;
  }

  throw new Error("Pages asset version is required.");
}

function resolveBuildVersion() {
  if (process.env.PAGES_ASSET_VERSION) {
    return process.env.PAGES_ASSET_VERSION;
  }

  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }

  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}

function shouldVersionUrl(url) {
  const trimmed = url.trim();

  if (
    !trimmed ||
    /^(?:#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed) ||
    trimmed.startsWith("/api/")
  ) {
    return false;
  }

  const pathPart = trimmed.split(/[?#]/, 1)[0];

  if (!versionedExtensions.test(pathPart)) {
    return false;
  }

  return (
    pathPart.startsWith("./") ||
    pathPart.startsWith("../") ||
    pathPart.startsWith("assets/") ||
    pathPart.startsWith("css/") ||
    pathPart.startsWith("js/")
  );
}

export function versionUrl(url, version) {
  if (!shouldVersionUrl(url)) {
    return url;
  }

  const hashIndex = url.indexOf("#");
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);

  return `${pathname}?v=${encodeURIComponent(version)}${hash}`;
}

function versionHtml(content, version) {
  return content.replace(
    /(\b(?:href|src)=)(["'])([^"']+)\2/g,
    (match, attribute, quote, url) => `${attribute}${quote}${versionUrl(url, version)}${quote}`
  );
}

function versionCss(content, version) {
  return content.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/g,
    (match, quote, url) => `url(${quote}${versionUrl(url, version)}${quote})`
  );
}

function versionJs(content, version) {
  return content
    .replace(
      /(\bfrom\s+)(["'])([^"']+)\2/g,
      (match, prefix, quote, url) => `${prefix}${quote}${versionUrl(url, version)}${quote}`
    )
    .replace(
      /(\bimport\s+)(["'])([^"']+)\2/g,
      (match, prefix, quote, url) => `${prefix}${quote}${versionUrl(url, version)}${quote}`
    )
    .replace(
      /(\b(?:href|src)=)(["'])([^"']+)\2/g,
      (match, attribute, quote, url) => `${attribute}${quote}${versionUrl(url, version)}${quote}`
    );
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function versionStaticFiles(outputDir, version) {
  const files = await walkFiles(outputDir);
  const updatedFiles = [];

  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();

    if (![".html", ".css", ".js"].includes(extension)) {
      continue;
    }

    const content = await readFile(filePath, "utf8");
    let nextContent = content;

    if (extension === ".html") {
      nextContent = versionHtml(content, version);
    } else if (extension === ".css") {
      nextContent = versionCss(content, version);
    } else if (extension === ".js") {
      nextContent = versionJs(content, version);
    }

    if (nextContent !== content) {
      await writeFile(filePath, nextContent);
      updatedFiles.push(path.relative(outputDir, filePath));
    }
  }

  return updatedFiles.sort();
}

export async function buildPagesStaticSite(options = {}) {
  const sourceDir = path.resolve(options.sourceDir || path.join(repoRoot, "public"));
  const outputDir = path.resolve(options.outputDir || path.join(repoRoot, "_site"));
  const version = normalizeVersion(options.version || resolveBuildVersion());

  const sourceStats = await stat(sourceDir).catch(() => null);

  if (!sourceStats?.isDirectory()) {
    throw new Error(`Pages source directory does not exist: ${sourceDir}`);
  }

  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });
  await cp(sourceDir, outputDir, { recursive: true });
  await writeFile(path.join(outputDir, ".nojekyll"), "");

  const updatedFiles = await versionStaticFiles(outputDir, version);

  return {
    outputDir,
    updatedFiles,
    version,
  };
}

async function main() {
  const outputDir = process.argv[2] || path.join(repoRoot, "_site");
  const version = process.argv[3] || resolveBuildVersion();
  const result = await buildPagesStaticSite({ outputDir, version });

  console.log(`Built GitHub Pages static output at ${result.outputDir}`);
  console.log(`Asset version: ${result.version}`);
  console.log(`Versioned files: ${result.updatedFiles.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
