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
  constructor({ cloudflareClient, credentialSessionService }) {
    this.cloudflareClient = cloudflareClient;
    this.credentialSessionService = credentialSessionService;
  }

  status = async ({ request }) => {
    const sessionCredentials = this.credentialSessionService.getCredentials(request);
    const baseCredentials = this.cloudflareClient.getBaseCredentials();
    const credentials = sessionCredentials || baseCredentials;
    const hasCredentials = Boolean(credentials.email && credentials.globalApiKey);

    return {
      statusCode: 200,
      body: {
        hasCredentials,
        email: hasCredentials ? maskEmail(credentials.email) : "",
        expiresAt: sessionCredentials?.expiresAt || "",
        source: sessionCredentials ? "cookie" : hasCredentials ? "server" : "",
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

    const existingSession = this.credentialSessionService.getCredentials(request);
    const baseCredentials = this.cloudflareClient.getBaseCredentials();
    const email =
      suppliedEmail ||
      existingSession?.email ||
      baseCredentials.email;
    const globalApiKey =
      suppliedGlobalApiKey ||
      existingSession?.globalApiKey ||
      baseCredentials.globalApiKey;

    if (!email || !globalApiKey) {
      return {
        statusCode: 400,
        body: {
          error: "请输入 Cloudflare 账号邮箱和 Global API Key，或在 .env 中配置凭据。",
        },
      };
    }

    if (existingSession && !hasCompleteSuppliedCredentials) {
      return {
        statusCode: 200,
        body: {
          hasCredentials: true,
          email: maskEmail(existingSession.email),
          expiresAt: existingSession.expiresAt,
          source: "cookie",
        },
      };
    }

    if (!hasCompleteSuppliedCredentials) {
      return {
        statusCode: 200,
        body: {
          hasCredentials: true,
          email: maskEmail(email),
          expiresAt: "",
          source: "server",
        },
      };
    }

    const session = this.credentialSessionService.create({
      email,
      globalApiKey,
      source: "browser",
    });

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": this.credentialSessionService.createCookie(request, session),
      },
      body: {
        hasCredentials: true,
        email: maskEmail(email),
        expiresAt: session.expiresAt,
        source: "cookie",
      },
    };
  };

  logout = async ({ request }) => {
    this.credentialSessionService.revoke(request);

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": this.credentialSessionService.clearCookie(request),
      },
      body: {
        ok: true,
      },
    };
  };
}
