import { readJsonBody } from "../lib/request-body.js";
import { maskEmail } from "../services/cloudflare-account-service.js";

export class CredentialsController {
  constructor({ cloudflareAccountService, cloudflareClient, credentialSessionService, panelAuthService }) {
    this.cloudflareAccountService = cloudflareAccountService;
    this.cloudflareClient = cloudflareClient;
    this.credentialSessionService = credentialSessionService;
    this.panelAuthService = panelAuthService;
  }

  status = async ({ request }) => {
    const sessionCredentials = this.credentialSessionService.getCredentials(request);
    const panelLoginConfigured = this.panelAuthService.isConfigured();
    const hasCloudflareAccounts = this.cloudflareAccountService.hasAccounts();
    const authenticated = panelLoginConfigured
      ? Boolean(sessionCredentials?.authenticated)
      : hasCloudflareAccounts;
    const activeCloudflareAccountId = this.cloudflareAccountService.resolveSelectedAccountId(
      sessionCredentials?.activeCloudflareAccountId
    );
    const activeCloudflareAccount = authenticated
      ? this.cloudflareAccountService.getSafeAccount(activeCloudflareAccountId)
      : null;
    const accounts = authenticated
      ? this.cloudflareAccountService.listSafe(activeCloudflareAccountId)
      : [];

    return {
      statusCode: 200,
      body: {
        accounts,
        activeCloudflareAccount,
        authenticated,
        email: authenticated ? activeCloudflareAccount?.email || "" : "",
        expiresAt: sessionCredentials?.expiresAt || "",
        hasCredentials: authenticated && hasCloudflareAccounts,
        loginRequired: panelLoginConfigured,
        source: authenticated
          ? sessionCredentials?.authenticated
            ? "cookie"
            : "server"
          : "",
      },
    };
  };

  connect = async ({ request }) => {
    const body = await readJsonBody(request);
    const user = String(body.user || body.username || "").trim();
    const password = String(body.password || "").trim();
    const auth = String(body.auth || body.authCode || body.totp || "").trim();
    const activeCloudflareAccountId = String(body.cloudflareAccountId || "").trim();

    if (!this.panelAuthService.isConfigured()) {
      return {
        statusCode: 412,
        body: {
          error: "请先配置 USER、PASSWORD、AUTH 三个环境变量。",
        },
      };
    }

    if (!user || !password || !auth) {
      return {
        statusCode: 400,
        body: {
          error: "请输入用户名、密码和 2FA 验证码。",
        },
      };
    }

    if (!this.panelAuthService.verify({ auth, password, user })) {
      return {
        statusCode: 401,
        body: {
          error: "用户名、密码或 2FA 验证码错误。",
        },
      };
    }

    if (!this.cloudflareAccountService.hasAccounts()) {
      return {
        statusCode: 412,
        body: {
          error: "请至少配置一组 Cloudflare 账号环境变量，例如 EMAIL1 和 CF_API1。",
        },
      };
    }

    const selectedAccountId =
      this.cloudflareAccountService.resolveSelectedAccountId(activeCloudflareAccountId);
    const session = this.credentialSessionService.create({
      activeCloudflareAccountId: selectedAccountId,
      authenticated: true,
      source: "panel",
    });
    const activeCloudflareAccount = this.cloudflareAccountService.getSafeAccount(selectedAccountId);

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": this.credentialSessionService.createCookie(request, session),
      },
      body: {
        accounts: this.cloudflareAccountService.listSafe(selectedAccountId),
        activeCloudflareAccount,
        authenticated: true,
        email: activeCloudflareAccount?.email || "",
        expiresAt: session.expiresAt,
        hasCredentials: true,
        loginRequired: true,
        source: "cookie",
      },
    };
  };

  switchCloudflareAccount = async ({ params, request }) => {
    const sessionCredentials = this.credentialSessionService.getCredentials(request);

    if (!sessionCredentials?.authenticated) {
      return {
        statusCode: 401,
        body: { error: "请先登录面板。" },
      };
    }

    const requestedAccountId = String(params.accountId || "").trim();
    const accountExists = this.cloudflareAccountService.hasAccount(requestedAccountId);
    const account = accountExists
      ? this.cloudflareAccountService.getSafeAccount(requestedAccountId)
      : null;

    if (!account) {
      return {
        statusCode: 404,
        body: { error: "Cloudflare 账号不存在。" },
      };
    }

    const session = this.credentialSessionService.update(request, {
      activeCloudflareAccountId: requestedAccountId,
    });

    return {
      statusCode: 200,
      body: {
        accounts: this.cloudflareAccountService.listSafe(requestedAccountId),
        activeCloudflareAccount: account,
        authenticated: true,
        email: account.email,
        expiresAt: session?.expiresAt || sessionCredentials.expiresAt || "",
        hasCredentials: true,
        loginRequired: true,
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
