import { HttpError } from "./http-error.js";

const readOnlyPrefixes = new Set(["select", "with"]);
const mutationKeywordPattern =
  /\b(alter|attach|create|delete|detach|drop|insert|pragma|reindex|replace|update|vacuum)\b/i;

function stripComments(sql = "") {
  return String(sql || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ");
}

function hasMultipleStatements(sql = "") {
  const withoutTrailingSemicolon = String(sql || "").trim().replace(/;\s*$/, "");

  return stripComments(withoutTrailingSemicolon).includes(";");
}

function firstWord(sql = "") {
  return stripComments(sql).trim().match(/^[A-Za-z]+/)?.[0]?.toLowerCase() || "";
}

export function assertD1SqlAllowed(sql = "", { allowMutations = false } = {}) {
  const normalized = String(sql || "").trim();

  if (hasMultipleStatements(normalized)) {
    throw new HttpError(400, "D1 SQL 控制台只允许一次执行一条语句。");
  }

  if (allowMutations) {
    return;
  }

  const command = firstWord(normalized);

  if (!readOnlyPrefixes.has(command) || mutationKeywordPattern.test(stripComments(normalized))) {
    throw new HttpError(
      403,
      "D1 SQL 控制台默认只允许 SELECT/WITH 查询；如需写入请显式开启 ENABLE_D1_SQL_MUTATIONS=true。"
    );
  }
}
