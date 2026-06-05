import { readJsonBody } from "../lib/request-body.js";

function maskEmail(email) {
  const [name = "", domain = ""] = String(email).split("@");

  if (!name || !domain) {
    return "";
  }

  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

export class CredentialsController {
  constructor({ cloudflareClient }) {
    this.cloudflareClient = cloudflareClient;
  }

  status = async () => {
    const hasCredentials = this.cloudflareClient.hasCredentials();

    return {
      statusCode: 200,
      body: {
        hasCredentials,
        email: hasCredentials ? maskEmail(this.cloudflareClient.email) : "",
      },
    };
  };

  connect = async ({ request }) => {
    const body = await readJsonBody(request);
    const suppliedEmail = String(body.email || "").trim();
    const suppliedGlobalApiKey = String(body.globalApiKey || body.apiKey || "").trim();
    const hasSuppliedCredentials = Boolean(suppliedEmail || suppliedGlobalApiKey);
    const hasCompleteSuppliedCredentials = Boolean(suppliedEmail && suppliedGlobalApiKey);

    if (hasSuppliedCredentials && !hasCompleteSuppliedCredentials) {
      return {
        statusCode: 400,
        body: {
          error: "请同时填写 Cloudflare 账号邮箱和 Global API Key。",
        },
      };
    }

    const email = hasCompleteSuppliedCredentials
      ? suppliedEmail
      : this.cloudflareClient.email;
    const globalApiKey = hasCompleteSuppliedCredentials
      ? suppliedGlobalApiKey
      : this.cloudflareClient.globalApiKey;

    if (!email || !globalApiKey) {
      return {
        statusCode: 400,
        body: {
          error: "请输入 Cloudflare 账号邮箱和 Global API Key，或在 .env 中配置凭据。",
        },
      };
    }

    if (hasCompleteSuppliedCredentials) {
      this.cloudflareClient.setCredentials({ email, globalApiKey });
    }

    return {
      statusCode: 200,
      body: {
        hasCredentials: true,
        email: maskEmail(email),
      },
    };
  };
}
