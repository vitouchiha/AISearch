import { Context } from "../config/deps.ts";

export const responseLog = async (ctx: Context, next: () => Promise<unknown>) => {
    const start = performance.now();
    await next();
    const ms = performance.now() - start;
  
    let logUrl = ctx.request.url.href;
    const apiKeyRegex = /\/AIza[a-zA-Z0-9_-]+/g;
    logUrl = logUrl.replace(apiKeyRegex, "/[API_KEY_OBFUSCATED]");
  
    console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${logUrl} - ${ms.toFixed(2)}ms`);
  };