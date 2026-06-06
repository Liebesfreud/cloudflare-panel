function maskEmail(email) {
  const [name = "", domain = ""] = String(email).split("@");

  if (!name || !domain) {
    return "";
  }

  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

function normalizeAccount(account) {
  if (!account) {
    return null;
  }

  const email = String(account.email || "").trim();
  const globalApiKey = String(account.globalApiKey || "").trim();

  if (!email || !globalApiKey) {
    return null;
  }

  const id = String(account.id || "").trim();
  const name = String(account.name || account.label || "").trim();

  if (!id) {
    return null;
  }

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
  constructor({ store } = {}) {
    this.store = store;
  }

  listAccounts() {
    return (this.store?.listCloudflareAccounts() || []).map(normalizeAccount).filter(Boolean);
  }

  hasAccounts() {
    return Boolean(this.store?.hasCloudflareAccounts());
  }

  listSafe(activeAccountId = "") {
    return this.listAccounts().map((account) => ({
      active: account.id === activeAccountId,
      email: maskEmail(account.email),
      id: account.id,
      name: account.name,
      source: account.source,
    }));
  }

  getDefaultAccount() {
    return normalizeAccount(this.store?.getCloudflareAccount()) || null;
  }

  getAccount(accountId = "") {
    if (accountId) {
      return normalizeAccount(this.store?.getCloudflareAccount(accountId));
    }

    return this.getDefaultAccount();
  }

  findAccount(accountId = "") {
    return accountId ? normalizeAccount(this.store?.getCloudflareAccount(accountId)) : null;
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
    if (accountId && this.hasAccount(accountId)) {
      return accountId;
    }

    return this.getDefaultAccount()?.id || "";
  }
}
