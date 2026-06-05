import { HttpError } from "../../lib/http-error.js";
import { normalizeCloudflareZone } from "./zone-normalizer.js";

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
}
