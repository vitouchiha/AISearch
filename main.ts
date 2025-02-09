import { Application, oakCors, Context } from "./config/deps.ts";
import { PORT } from "./config/env.ts"
import router from "./routes.ts";

const app = new Application();

app.use(async (ctx: Context, next) => {
  const start = performance.now();
  await next();
  const ms = performance.now() - start;
  console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${ctx.request.url} - ${ms.toFixed(2)}ms`);
});

app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

console.log(`[${new Date().toISOString()}] Stremio AI Addon running on port ${PORT}`);
await app.listen({ hostname: "0.0.0.0", port: PORT });