import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareResourceId } from "./cloudflare-id.js";
import { normalizeCloudflareZone } from "./zone-normalizer.js";

const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function normalizeDomainName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .split(/[/?#]/)[0]
    .replace(/\.$/, "");
}

function assertDomainName(value) {
  const name = normalizeDomainName(value);

  if (!domainPattern.test(name)) {
    throw new HttpError(400, "域名格式无效，请输入 example.com 这样的一级域名");
  }

  return name;
}

function normalizeAccount(account = {}) {
  return {
    id: account.id || "",
    name: account.name || account.id || "Cloudflare Account",
  };
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();

  return ["1", "true", "yes", "on"].includes(normalized);
}

export class ZonesService {
  constructor({ cloudflareClient, perPage = 50 }) {
    this.cloudflareClient = cloudflareClient;
    this.perPage = perPage;
  }

  async listZones() {
    const zones = [];
    let page = 1;
    let totalPages = 1;

    do {
      const payload = await this.cloudflareClient.get("zones", {
        page,
        per_page: this.perPage,
        direction: "asc",
        order: "name",
      });

      if (!Array.isArray(payload.result)) {
        throw new HttpError(502, "Cloudflare API 返回格式异常，请稍后重试。");
      }

      zones.push(...payload.result.map(normalizeCloudflareZone));

      const reportedTotalPages = Number(payload.result_info?.total_pages);
      totalPages =
        Number.isFinite(reportedTotalPages) && reportedTotalPages >= page
          ? reportedTotalPages
          : page;
      page += 1;
    } while (page <= totalPages);

    return zones;
  }

  async listAccounts() {
    const payload = await this.cloudflareClient.get("accounts", {
      page: 1,
      per_page: 50,
      direction: "asc",
    });

    if (!Array.isArray(payload.result)) {
      throw new HttpError(502, "Cloudflare 账号列表返回格式异常，请稍后重试。");
    }

    return payload.result.map(normalizeAccount).filter((account) => account.id);
  }

  async resolveAccountId(accountId = "") {
    const requestedAccountId = String(accountId || "").trim();

    if (requestedAccountId) {
      assertCloudflareResourceId(requestedAccountId, "账号 ID");
      return requestedAccountId;
    }

    const accounts = await this.listAccounts();

    if (!accounts[0]?.id) {
      throw new HttpError(404, "当前账号下没有可用 Cloudflare Account，无法添加域名");
    }

    return accounts[0].id;
  }

  async createZone(input = {}) {
    const name = assertDomainName(input.name || input.domain);
    const accountId = await this.resolveAccountId(input.accountId || input.account_id);
    const type = String(input.type || "full").trim().toLowerCase();

    if (!["full", "partial"].includes(type)) {
      throw new HttpError(400, "域名接入类型只能是 full 或 partial");
    }

    const payload = await this.cloudflareClient.post("zones", {
      account: { id: accountId },
      jump_start: normalizeBoolean(input.jumpStart ?? input.jump_start),
      name,
      type,
    });

    return normalizeCloudflareZone(payload.result);
  }
}
