import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId, assertCloudflareResourceId } from "./cloudflare-id.js";

const certificatePemPattern = /-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/;
const privateKeyPemPattern =
  /-----BEGIN (?:RSA |EC |PRIVATE |ENCRYPTED )?PRIVATE KEY-----[\s\S]+-----END (?:RSA |EC |PRIVATE |ENCRYPTED )?PRIVATE KEY-----/;
const hostPattern = /^(?:\*\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

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

function normalizeOriginCertificate(certificate = {}) {
  return {
    id: certificate.id || "",
    certificate: certificate.certificate || "",
    csr: certificate.csr || "",
    expiresOn: certificate.expires_on || "",
    hostnames: Array.isArray(certificate.hostnames) ? certificate.hostnames : [],
    requestType: certificate.request_type || "",
    requestedValidity: certificate.requested_validity || null,
    revokedAt: certificate.revoked_at || "",
  };
}

function normalizePem(value, label, pattern) {
  const text = String(value || "").trim();

  if (!pattern.test(text)) {
    throw new HttpError(400, `${label} PEM 格式无效`);
  }

  return text;
}

function normalizeCertificateChain(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (!certificatePemPattern.test(text)) {
    throw new HttpError(400, "证书链 PEM 格式无效");
  }

  return text;
}

function normalizeCertificateHosts(value) {
  const hosts = (Array.isArray(value) ? value : String(value || "").split(/[\s,，]+/))
    .map((item) => String(item || "").trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);

  if (hosts.length === 0 || hosts.length > 50) {
    throw new HttpError(400, "证书域名不能为空，且最多 50 个");
  }

  for (const hostname of hosts) {
    if (!hostPattern.test(hostname)) {
      throw new HttpError(400, `证书域名 ${hostname} 格式无效`);
    }
  }

  return [...new Set(hosts)];
}

function normalizeCustomCertificateInput(input = {}) {
  const certificate = normalizePem(input.certificate, "证书", certificatePemPattern);
  const privateKey = normalizePem(input.privateKey, "私钥", privateKeyPemPattern);
  const bundleMethod = String(input.bundleMethod || "ubiquitous").trim();
  const geoRestrictions = String(input.geoRestrictions || "").trim();
  const priority = Number(input.priority);
  const body = {
    certificate,
    private_key: privateKey,
    bundle_method: ["ubiquitous", "optimal", "force"].includes(bundleMethod)
      ? bundleMethod
      : "ubiquitous",
  };
  const certificateChain = normalizeCertificateChain(input.certificateChain);

  if (certificateChain) {
    body.certificate_chain = certificateChain;
  }

  if (Number.isInteger(priority) && priority >= 0) {
    body.priority = priority;
  }

  if (geoRestrictions) {
    body.geo_restrictions = { label: geoRestrictions };
  }

  return body;
}

function normalizeOriginCertificateInput(input = {}) {
  const hostnames = normalizeCertificateHosts(input.hostnames);
  const requestedValidity = Number(input.requestedValidity || 5475);
  const requestType = String(input.requestType || "origin-rsa").trim();
  const body = {
    hostnames,
    requested_validity: Number.isInteger(requestedValidity)
      ? Math.min(Math.max(requestedValidity, 7), 5475)
      : 5475,
    request_type: ["origin-rsa", "origin-ecc", "keyless-certificate"].includes(requestType)
      ? requestType
      : "origin-rsa",
  };
  const csr = String(input.csr || "").trim();

  if (csr) {
    body.csr = csr;
  }

  return body;
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
    const [{ universalSsl, warning }, customCertificatesResult, originCertificatesResult] = await Promise.all([
      this.getUniversalSsl(zoneId),
      this.listCustomCertificates(zoneId)
        .then((certificates) => ({ certificates, warning: "" }))
        .catch((error) => ({
          certificates: [],
          warning: `自定义证书列表读取失败：${error.message}`,
        })),
      this.listOriginCertificates(zoneId)
        .then((certificates) => ({ certificates, warning: "" }))
        .catch((error) => ({
          certificates: [],
          warning: `Origin CA 证书列表读取失败：${error.message}`,
        })),
    ]);

    return {
      certificates: customCertificatesResult.certificates,
      originCertificates: originCertificatesResult.certificates,
      universalSsl,
      warnings: [warning, customCertificatesResult.warning, originCertificatesResult.warning].filter(Boolean),
    };
  }

  async uploadCustomCertificate(zoneId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    const payload = await this.cloudflareClient.post(
      `zones/${zoneId}/custom_certificates`,
      normalizeCustomCertificateInput(input)
    );

    return normalizeCustomCertificate(payload.result || {});
  }

  async listOriginCertificates(zoneId) {
    assertCloudflareId(zoneId, "区域 ID");
    const certificates = [];
    let page = 1;
    let totalPages = 1;

    do {
      const payload = await this.cloudflareClient.get("certificates", {
        zone_id: zoneId,
        page,
        per_page: this.perPage,
      });

      if (!Array.isArray(payload.result)) {
        throw new HttpError(502, "Cloudflare Origin CA 证书返回格式异常，请稍后重试。");
      }

      certificates.push(...payload.result.map(normalizeOriginCertificate));

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

  async createOriginCertificate(zoneId, input) {
    assertCloudflareId(zoneId, "区域 ID");
    const payload = await this.cloudflareClient.post("certificates", {
      ...normalizeOriginCertificateInput(input),
      zone_id: zoneId,
    });

    return normalizeOriginCertificate(payload.result || {});
  }

  async deleteOriginCertificate(zoneId, certificateId) {
    assertCloudflareId(zoneId, "区域 ID");
    assertCloudflareResourceId(certificateId, "Origin CA 证书 ID");
    const payload = await this.cloudflareClient.delete(`certificates/${certificateId}`);

    return { id: payload.result?.id || certificateId };
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
