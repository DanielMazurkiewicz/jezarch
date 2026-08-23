// Simple in-memory fixed-window rate limiter for auth-sensitive endpoints.
// Suitable for the single-process, LAN-oriented deployment model of this app.

interface Bucket {
    count: number;
    windowStart: number;
    windowMs: number;
}

const buckets = new Map<string, Bucket>();

// Lazy cleanup: periodically drop stale buckets so the map cannot grow forever.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function sweep(now: number) {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
        if (now >= bucket.windowStart + bucket.windowMs) buckets.delete(key);
    }
}

export interface RateLimitRule {
    /** Maximum requests allowed per window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
}

/**
 * Records a hit for `key`. Returns false when the rate limit is exceeded,
 * together with the number of seconds until the caller may retry.
 */
export function checkRateLimit(key: string, rule: RateLimitRule): { allowed: boolean; retryAfterSec: number } {
    if (process.env.JEZARCH_RATE_LIMIT_DISABLED === '1') {
        return { allowed: true, retryAfterSec: 0 };
    }

    const now = Date.now();
    sweep(now);

    const existing = buckets.get(key);
    const bucket: Bucket = existing && now < existing.windowStart + existing.windowMs
        ? existing
        : { count: 0, windowStart: now, windowMs: rule.windowMs };
    buckets.set(key, bucket);
    bucket.count += 1;

    if (bucket.count > rule.limit) {
        const retryAfterSec = Math.max(1, Math.ceil((bucket.windowStart + bucket.windowMs - now) / 1000));
        return { allowed: false, retryAfterSec };
    }
    return { allowed: true, retryAfterSec: 0 };
}

/** Best-effort client identity for throttling. */
export function clientKey(headers: Headers): string {
    const fwd = headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]?.trim() || 'local';
    return headers.get('x-real-ip') || 'local';
}
