import { Context } from "../config/deps.ts";
import { applyRateLimit, tokenRatelimit } from "../config/redisCache.ts";

export const rateLimitMiddleware = async (
  ctx: Context,
  next: () => Promise<unknown>,
) => {
  const identifier = ctx.request.headers.get("cf-connecting-ip") || ctx.request.ip;
  const isAllowed = await applyRateLimit(ctx, identifier);

  if (!isAllowed) {
    ctx.response.status = 429;
    ctx.response.body = { error: "Too many requests. Please try again later." };
    return;
  }
  await next();
};


export const tokenRateLimitMiddleware = async (
  ctx: Context,
  next: () => Promise<unknown>,
) => {
  const identifier = ctx.request.headers.get("cf-connecting-ip") || ctx.request.ip;
  const isAllowed = await applyRateLimit(ctx, identifier, tokenRatelimit);

  if (!isAllowed) {
    ctx.response.status = 429;
    ctx.response.body = { error: "Too many requests. Please try again later." };
    return;
  }
  await next();
};