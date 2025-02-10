import { Redis, Ratelimit } from "./deps.ts";
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