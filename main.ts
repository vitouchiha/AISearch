import { Application, Context, oakCors } from "./config/deps.ts";
import { PORT, DEV_MODE, NGROK_URL } from "./config/env.ts";
import { rateLimitMiddleware } from "./middleware/ratelimitMiddleware.ts";
import router from "./routes.ts";
import { cacheRoute } from "./stashRoute.ts";
import { traktRouter } from "./services/trakt.ts";
import { keysRoutes } from "./keysRoutes.ts";
import { responseLog } from "./middleware/ResponseLog.ts";
import { log, logError } from "./utils/utils.ts";

const app = new Application();

app.use(async (ctx: Context, next) => {
  ctx.response.headers.set("X-Content-Type-Options", "nosniff");
  ctx.response.headers.set("X-Frame-Options", "DENY");
  ctx.response.headers.set("X-XSS-Protection", "1; mode=block");
  await next();
});

app.use(oakCors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"], 
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(responseLog);
app.use(rateLimitMiddleware);

app.use(router.routes());
app.use(router.allowedMethods());

app.use(traktRouter.routes());
app.use(traktRouter.allowedMethods());

app.use(keysRoutes.routes());
app.use(keysRoutes.allowedMethods());

app.use(cacheRoute.routes());
app.use(cacheRoute.allowedMethods());

app.use((ctx: Context) => {
  ctx.response.status = 404;
  ctx.response.body = { error: "Endpoint not found" };
});

app.addEventListener("error", (evt) => {
  const error = evt.error;
  if (error instanceof Deno.errors.BrokenPipe || error.message.includes("broken pipe")) {
    log("Client disconnected early (broken pipe). Ignoring...");
    return;
  }
  logError(`Unhandled error:`, error);
});

app.addEventListener("listen", ({ port }) => {
  console.log(`Stremio AI Addon running on port ${port}`);
  DEV_MODE ? console.log(`Ngrok running on ${NGROK_URL}`) : null;
});

await app.listen({ hostname: "0.0.0.0", port: PORT });