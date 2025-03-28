import type { Application } from "../config/deps.ts";

export function setupSecurityHeaders(app: Application) {
  app.use(async (ctx, next) => {
    ctx.response.headers.set("X-Frame-Options", "DENY");
    ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
    // ctx.response.headers.set("X-Content-Type-Options", "nosniff");
    ctx.response.headers.set("Referrer-Policy", "no-referrer");
    ctx.response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    //ctx.response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';");
    ctx.response.headers.set("Permissions-Policy", "geolocation=(), microphone=()");
    await next();
  });
}
