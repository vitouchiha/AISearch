import { Redis } from "./deps.ts";
import { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN } from "./env.ts";

export const redis = new Redis({
    url: UPSTASH_REDIS_URL!,
    token: UPSTASH_REDIS_TOKEN!,
  });