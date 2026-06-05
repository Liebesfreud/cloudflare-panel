import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId, assertCloudflareResourceId } from "./cloudflare-id.js";

function normalizeUniversalSsl(result = {}) {
  const enabled =
    result.enabled === true ||
    result.value === "auto" ||
    result.certificate_authority === "lets_encrypt" ||
    result.certificate_authority === "google";

  return {
    enabled,
    value: result.value || (enabled ? "auto" : "custom"),
    certificateAuthority: result.certificate_authority || "",
    editable: result.editable !== false,
    modifiedOn: result.modified_on || "",
  };
}

function normalizeCustomCertificate(certificate = {}) {
  return {
    id: certificate.id || "",
    hosts: Array.isArray(certificate.hosts) ? certificate.hosts : [],
    issuer: certificate.issuer || "",
    signature: certificate.signature || "",
    status: certificate.status || "unknown",
    expiresOn: certificate.expires_on || "",
    uploadedOn: certificate.uploaded_on || certificate.created_on || "",
    modifiedOn: certificate.modified_on || "",
    priority: Number.isFinite(Number(certificate.priority))
      ? Number(certificate.priority)
      : null,
  };
}

export class CertificatesService {
  constructor({ cloudflareClient, perPage = 50 }) {
    this.cloudflareClient = cloudflareClient;
    this.perPage = perPage;
  }

  async getUniversalSsl(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");

    try {
      const payload = await this.cloudflareClient.get(`zones/${zoneId}/ssl/universal/settings`);
      return {
        universalSsl: normalizeUniversalSsl(payload.result || {}),
        warning: "",
      };
    } catch (error) {
      return {
        universalSsl: normalizeUniversalSsl({ enabled: true, value: "auto" }),
        warning: `Universal SSL 状态读取失败：${error.message}`,
      };
    }
  }

  async listCustomCertificates(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");

    const certificates = [];
    let page = 1;
    let totalPages = 1;

    do {
      const payload = await this.cloudflareClient.get(`zones/${zoneId}/custom_certificates`, {
        page,
        per_page: this.perPage,
      });

      if (!Array.isArray(payload.result)) {
        throw new HttpError(502, "Cloudflare 自定义证书返回格式异常，请稍后重试。");
      }

      certificates.push(...payload.result.map(normalizeCustomCertificate));

      const pageCount = Number(payload.result_info?.total_pages);
      const totalCount = Number(payload.result_info?.total_count);
      totalPages = Number.isFinite(pageCount)
        ? Math.max(1, pageCount)
        : Number.isFinite(totalCount)
          ? Math.max(1, Math.ceil(totalCount / this.perPage))
          : page;
      page += 1;
    } while (page <= totalPages);

    return certificates;
  }

  async getCertificateState(zoneId) {
    const [{ universalSsl, warning }, customCertificatesResult] = await Promise.all([
      this.getUniversalSsl(zoneId),
      this.listCustomCertificates(zoneId)
        .then((certificates) => ({ certificates, warning: "" }))
        .catch((error) => ({
          certificates: [],
          warning: `自定义证书列表读取失败：${error.message}`,
        })),
    ]);

    return {
      certificates: customCertificatesResult.certificates,
      universalSsl,
      warnings: [warning, customCertificatesResult.warning].filter(Boolean),
    };
  }

  async deleteCustomCertificate(zoneId, certificateId) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareResourceId(certificateId, "证书 ID");
    const payload = await this.cloudflareClient.delete(
      `zones/${zoneId}/custom_certificates/${certificateId}`
    );

    return { id: payload.result?.id || certificateId };
  }
}
