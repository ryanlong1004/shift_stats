type RateLimitOptions = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

declare global {
  var __shiftstatsRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!globalThis.__shiftstatsRateLimitStore) {
    globalThis.__shiftstatsRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalThis.__shiftstatsRateLimitStore;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function consumeRateLimit(
  request: Request,
  options: RateLimitOptions,
): RateLimitResult {
  const store = getStore();
  const now = Date.now();
  const clientIp = getClientIp(request);
  const storeKey = `${options.key}:${clientIp}`;
  const existing = store.get(storeKey);

  if (!existing || existing.resetAt <= now) {
    store.set(storeKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(options.maxRequests - 1, 0),
    };
  }

  if (existing.count >= options.maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
      remaining: 0,
    };
  }

  existing.count += 1;
  store.set(storeKey, existing);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(options.maxRequests - existing.count, 0),
  };
}
