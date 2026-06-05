import { HttpError } from "../lib/http-error.js";

export class CertificatesController {
  constructor({ certificatesService }) {
    this.certificatesService = certificatesService;
  }

  get = async ({ params }) => {
    const result = await this.certificatesService.getCertificateState(params.zoneId);
    return { statusCode: 200, body: result };
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
}
