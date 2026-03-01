import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const STANDARD_LIMIT = 100;
const ELEVATED_LIMIT = 300;
const SEARCH_LIMIT = 20;
const WINDOW_SECONDS = 60;

let redis: Redis | null = null;
let standardLimiter: Ratelimit | null = null;
let elevatedLimiter: Ratelimit | null = null;
let searchLimiter: Ratelimit | null = null;
let initialized = false;

function ensureInitialized(): boolean {
  if (initialized) return redis !== null;

  initialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "Rate limiting disabled: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured"
    );
    return false;
  }

  redis = new Redis({ url, token });

  standardLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(STANDARD_LIMIT, `${WINDOW_SECONDS} s`),
    prefix: "rl:standard",
  });

  elevatedLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(ELEVATED_LIMIT, `${WINDOW_SECONDS} s`),
    prefix: "rl:elevated",
  });

  searchLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(SEARCH_LIMIT, `${WINDOW_SECONDS} s`),
    prefix: "rl:search",
  });

  return true;
}

export async function checkRateLimit(
  apiKeyPrefix: string,
  rateLimitTier: string,
  isSearch: boolean
): Promise<RateLimitResult> {
  if (!ensureInitialized()) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  if (isSearch && searchLimiter) {
    const searchResult = await searchLimiter.limit(`search:${apiKeyPrefix}`);
    if (!searchResult.success) {
      return {
        success: false,
        limit: SEARCH_LIMIT,
        remaining: searchResult.remaining,
        reset: searchResult.reset,
      };
    }
  }

  const limiter = rateLimitTier === "elevated" ? elevatedLimiter : standardLimiter;
  const limit = rateLimitTier === "elevated" ? ELEVATED_LIMIT : STANDARD_LIMIT;

  if (!limiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const result = await limiter.limit(apiKeyPrefix);
  return {
    success: result.success,
    limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
