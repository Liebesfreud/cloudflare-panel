function normalizeOrigin(value = "") {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);

    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.host) {
      return "";
    }

    return parsed.origin;
  } catch {
    return "";
  }
}

function firstHeaderValue(value = "") {
  return String(value || "").split(",")[0].trim();
}

function normalizeProto(value = "") {
  const proto = firstHeaderValue(value).toLowerCase();

  return proto === "https" ? "https" : "http";
}

export function expectedRequestOrigin(request, { publicOrigin = "", trustProxyHeaders = false } = {}) {
  const configuredOrigin = normalizeOrigin(publicOrigin);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const host = String(request?.headers?.host || "").trim();

  if (!host) {
    return "";
  }

  const proto = trustProxyHeaders
    ? normalizeProto(request?.headers?.["x-forwarded-proto"] || "")
    : "http";

  return `${proto}://${host}`;
}

export function sameOriginRequest(
  request,
  { publicOrigin = "", trustProxyHeaders = false } = {}
) {
  const expectedOrigin = expectedRequestOrigin(request, { publicOrigin, trustProxyHeaders });
  const origin = String(request?.headers?.origin || "").trim();
  const referer = String(request?.headers?.referer || "").trim();

  if (!expectedOrigin) {
    return false;
  }

  if (origin) {
    return origin === expectedOrigin;
  }

  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return true;
}
