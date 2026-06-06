function nowMs() {
  return Date.now();
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export class RateLimiterService {
  constructor({ limit = 8, now = nowMs, windowMs = 15 * 60 * 1000 } = {}) {
    this.limit = normalizePositiveInteger(limit, 8);
    this.now = now;
    this.windowMs = normalizePositiveInteger(windowMs, 15 * 60 * 1000);
    this.buckets = new Map();
  }

  check(key = "") {
    const normalizedKey = String(key || "global");
    const current = this.now();
    const bucket = this.buckets.get(normalizedKey);

    if (!bucket || bucket.resetAt <= current) {
      const next = { count: 1, resetAt: current + this.windowMs };
      this.buckets.set(normalizedKey, next);
      return { allowed: true, remaining: this.limit - 1, retryAfterSeconds: 0 };
    }

    bucket.count += 1;

    if (bucket.count > this.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000)),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.limit - bucket.count),
      retryAfterSeconds: 0,
    };
  }

  reset(key = "") {
    this.buckets.delete(String(key || "global"));
  }
}
