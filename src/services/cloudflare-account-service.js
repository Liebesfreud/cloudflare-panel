function maskEmail(email) {
  const [name = "", domain = ""] = String(email).split("@");

  if (!name || !domain) {
    return "";
  }

  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

function normalizeAccount(account, index) {
  const email = String(account.email || "").trim();
  const globalApiKey = String(account.globalApiKey || "").trim();

  if (!email || !globalApiKey) {
    return null;
  }

  const id = String(account.id || `cf${index + 1}`).trim();
  const name = String(account.name || account.label || "").trim();

  return {
    email,
    globalApiKey,
    id,
    name: name || maskEmail(email),
    source: account.source || "env",
  };
}

export { maskEmail };

export class CloudflareAccountService {
  constructor({ accounts = [] } = {}) {
    this.accounts = accounts
      .map((account, index) => normalizeAccount(account, index))
      .filter(Boolean);
    this.accountMap = new Map(this.accounts.map((account) => [account.id, account]));
  }

  hasAccounts() {
    return this.accounts.length > 0;
  }

  listSafe(activeAccountId = "") {
    return this.accounts.map((account) => ({
      active: account.id === activeAccountId,
      email: maskEmail(account.email),
      id: account.id,
      name: account.name,
      source: account.source,
    }));
  }

  getDefaultAccount() {
    return this.accounts[0] || null;
  }

  getAccount(accountId = "") {
    if (accountId && this.accountMap.has(accountId)) {
      return this.accountMap.get(accountId);
    }

    return this.getDefaultAccount();
  }

  findAccount(accountId = "") {
    return accountId ? this.accountMap.get(accountId) || null : null;
  }

  hasAccount(accountId = "") {
    return Boolean(this.findAccount(accountId));
  }

  getSafeAccount(accountId = "") {
    const account = this.getAccount(accountId);

    if (!account) {
      return null;
    }

    return {
      email: maskEmail(account.email),
      id: account.id,
      name: account.name,
      source: account.source,
    };
  }

  getCredentials(accountId = "") {
    const account = this.getAccount(accountId);

    if (!account) {
      return { email: "", globalApiKey: "" };
    }

    return {
      accountId: account.id,
      email: account.email,
      globalApiKey: account.globalApiKey,
      source: account.source,
    };
  }

  resolveSelectedAccountId(accountId = "") {
    if (accountId && this.accountMap.has(accountId)) {
      return accountId;
    }

    return this.getDefaultAccount()?.id || "";
  }
}
