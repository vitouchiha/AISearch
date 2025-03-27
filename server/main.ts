import { Application, type Context, oakCors } from "./config/deps.ts";
import { PORT, DEV_MODE, NGROK_URL, NO_SEMANTIC_SEARCH, JWT_SECRET, CAPTCHA_SITE_KEY, CAPTCHA_SECRET_KEY } from "./config/env.ts";

import { rateLimitMiddleware } from "./middleware/ratelimitMiddleware.ts";

import { setupRoutes, routes,traktRoutes, keysRoutes, cacheRoute, keyCheckRoutes, configJsonRoute } from "./routes/setup.ts";

import { responseLog } from "./middleware/ResponseLog.ts";
import { handleServerError } from "./handlers/handleServerError.ts";

/**
 * Setup and start Deno Oak server
 */
async function startServer() {
  const app = new Application();

  app.use(async (ctx: Context, next) => {
    ctx.response.headers.set("X-Content-Type-Options", "nosniff");
    ctx.response.headers.set("X-Frame-Options", "DENY");
    ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
    await next();
  });

  app.use(oakCors({
    origin: "*",
    methods: ["GET","OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }));

  app.use(responseLog);
  app.use(rateLimitMiddleware);

  setupRoutes(app, [
    { router: routes },
    { router: traktRoutes },
    { router: keysRoutes },
    { router: cacheRoute },
    { router: configJsonRoute },
    { router: keyCheckRoutes },
  ]);

  app.use((ctx: Context) => {
    ctx.response.status = 404;
    ctx.response.body = { error: "Endpoint not found" };
  });

  app.addEventListener("error", handleServerError);

  app.addEventListener("listen", ({ port }) => {
    console.log(`Stremio AI Addon running on port ${port}`);
    if (DEV_MODE === "true" && NGROK_URL && NGROK_URL.length > 0) console.log(`Ngrok running on ${NGROK_URL}`);
    if (DEV_MODE === "true" && NO_SEMANTIC_SEARCH) console.log('!! Semantic Caching disabled !!');
    if (DEV_MODE === "true" && !JWT_SECRET) console.log('!! JWT disabled !!');
    if (DEV_MODE === "true" && (!CAPTCHA_SITE_KEY || !CAPTCHA_SECRET_KEY)) console.log('!! Captcha disabled !!');
  });

  await app.listen({ hostname: "0.0.0.0", port: PORT });
}

await startServer();