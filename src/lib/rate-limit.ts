type BucketEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __launchpilotRateLimitStore: Map<string, BucketEntry> | undefined;
}

const STORE = globalThis.__launchpilotRateLimitStore || new Map<string, BucketEntry>();
globalThis.__launchpilotRateLimitStore = STORE;

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = STORE.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    STORE.set(key, next);
    return { allowed: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  STORE.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}
