import { Context, Ratelimit, Redis } from "./deps.ts";
import { UPSTASH_REDIS_TOKEN, UPSTASH_REDIS_URL, NO_CACHE } from "./env.ts";

export const redis = NO_CACHE === "true"
  ? null
  : new Redis({
    url: UPSTASH_REDIS_URL!,
    token: UPSTASH_REDIS_TOKEN!,
    enableAutoPipelining: true,
  });

export const pipeline = redis?.pipeline();

const ratelimit = NO_CACHE === "true" || !redis
  ? null
  : new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "@upstash/ratelimit",
  });

export const tokenRatelimit = NO_CACHE === "true" || !redis
  ? null
  : new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "@upstash/ratelimit-token",
  });

export async function applyRateLimit(ctx: Context, identifier: string, limiter = ratelimit) {
  if (NO_CACHE === "true" || !limiter) {
    return true;
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429;
    ctx.response.body =
      "Rate limit exceeded. Please try again later.";
    return false;
  }
  return true;
}