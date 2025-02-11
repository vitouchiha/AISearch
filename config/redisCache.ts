import { Redis, Ratelimit, Context } from "./deps.ts";
import { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN } from "./env.ts";

export const redis = new Redis({
  url: UPSTASH_REDIS_URL!,
  token: UPSTASH_REDIS_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export async function applyRateLimit(ctx: Context, identifier: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429;
    ctx.response.body = "Rate limit exceeded. Please try again later.";
    return false;
  }
  return true;
}
