import { Application, oakCors, Context } from "./config/deps.ts";
import { DEV_MODE, PORT } from "./config/env.ts";
import { rateLimitMiddleware } from "./middleware/ratelimitMiddleware.ts";
import router from "./routes.ts";
import { responseLog } from "./middleware/ResponseLog.ts";

const app = new Application();

app.use(async (ctx: Context, next) => {
  ctx.response.headers.set("X-Content-Type-Options", "nosniff");
  ctx.response.headers.set("X-Frame-Options", "DENY");
  ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
  await next();
});

app.use(oakCors());
app.use(responseLog);
app.use(rateLimitMiddleware);

app.use(router.routes());
app.use(router.allowedMethods());

app.use((ctx: Context) => {
  ctx.response.status = 404;
  ctx.response.body = { error: "Endpoint not found" };
});

app.addEventListener("error", (evt) => console.error(`[${new Date().toISOString()}] Unhandled error:`, evt.error));

if(DEV_MODE) console.log(`[${new Date().toISOString()}] Stremio AI Addon running on port ${PORT}`);

await app.listen({ hostname: "0.0.0.0", port: PORT });