import { HttpError } from "../lib/http-error.js";
import { readJsonBody } from "../lib/request-body.js";

export class CertificatesController {
  constructor({ certificatesService }) {
    this.certificatesService = certificatesService;
  }

  get = async ({ params }) => {
    const result = await this.certificatesService.getCertificateState(params.zoneId);
    return { statusCode: 200, body: result };
  };

  upload = async ({ request, params }) => {
    const body = await readJsonBody(request, { maxBytes: 64 * 1024 });
    const certificate = await this.certificatesService.uploadCustomCertificate(
      params.zoneId,
      body
    );
    return { statusCode: 201, body: { certificate } };
  };

  createOrigin = async ({ request, params }) => {
    const body = await readJsonBody(request, { maxBytes: 32 * 1024 });
    const certificate = await this.certificatesService.createOriginCertificate(
      params.zoneId,
      body
    );
    return { statusCode: 201, body: { certificate } };
  };

  delete = async ({ params }) => {
    if (!params.certificateId) {
      throw new HttpError(400, "缺少证书 ID");
    }

    const result = await this.certificatesService.deleteCustomCertificate(
      params.zoneId,
      params.certificateId
    );
    return { statusCode: 200, body: result };
  };

  deleteOrigin = async ({ params }) => {
    if (!params.certificateId) {
      throw new HttpError(400, "缺少 Origin CA 证书 ID");
    }

    const result = await this.certificatesService.deleteOriginCertificate(
      params.zoneId,
      params.certificateId
    );
    return { statusCode: 200, body: result };
  };
}
