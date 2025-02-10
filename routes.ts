import { Router, type RouterContext } from "./config/deps.ts";
import { GEMINI_API_KEY } from "./config/env.ts";
import { manifest } from "./config/manifest.ts";
import { handleCatalogRequest } from "./handlers/handleCatalogRequest.ts";
import { ratelimit } from "./config/redisCache.ts";

type CatalogContext = RouterContext<
  "/:googleKey/catalog/movie/ai-movies/:searchParam",
  { googleKey: string; searchParam: string }
>;

type SearchParamContext = RouterContext<
  "/catalog/movie/ai-movies/:searchParam", 
  { searchParam: string }
>;

type ManifestContext = RouterContext<
  "/:googleKey/manifest.json",
  { googleKey: string }
>;

const router = new Router();

router.get("/:googleKey/catalog/movie/ai-movies/:searchParam", async (ctx: CatalogContext) => {
  let googleKey = ctx.params.googleKey!;
  const rawParam = ctx.params.searchParam!;
  const identifier = ctx.request.ip;

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429; // Too Many Requests
    ctx.response.body = "Rate limit exceeded. Please try again later.";
    return;
  }

  if (!rawParam.startsWith('search=') || !rawParam.endsWith('.json')) {
    ctx.throw(400, 'Invalid parameter format');
  }

  if (googleKey === 'default') googleKey = GEMINI_API_KEY;
  
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");
  console.log(`[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`);
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/catalog/movie/ai-movies/:searchParam", async (ctx: SearchParamContext) => {
  const googleKey = GEMINI_API_KEY;
  const rawParam = ctx.params.searchParam!;
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");
  const identifier = ctx.request.ip;

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429; // Too Many Requests
    ctx.response.body = "Rate limit exceeded. Please try again later.";
    return;
  }

  console.log(`[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`);
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/:googleKey/manifest.json", async (ctx: ManifestContext) => {
  const _googleKey = ctx.params.googleKey!;
  const identifier = ctx.request.ip;

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429; // Too Many Requests
    ctx.response.body = "Rate limit exceeded. Please try again later.";
    return;
  }

  console.log(`[${new Date().toISOString()}] Serving manifest`);
  ctx.response.headers.set("Cache-Control", "max-age=86400");

  const { behaviorHints, ...manifestWithoutBehavior } = manifest;
  ctx.response.body = manifestWithoutBehavior;
});

router.get("/manifest.json", async (ctx) => {
  console.log(`[${new Date().toISOString()}] Serving manifest`);

  const identifier = ctx.request.ip;

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429; // Too Many Requests
    ctx.response.body = "Rate limit exceeded. Please try again later.";
    return;
  }
  ctx.response.headers.set("Cache-Control", "max-age=86400");
  ctx.response.body = manifest;
}); 

router.get("/configure", async (ctx) => {
  ctx.response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

  const identifier = ctx.request.ip;

  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429; // Too Many Requests
    ctx.response.body = "Rate limit exceeded. Please try again later.";
    return;
  }

  await ctx.send({
    root: `${Deno.cwd()}/static`,
    path: "configure.html",
    index: "configure.html",
  });
});

router.get("/", (ctx) => {
  ctx.response.redirect('/configure');
});

export default router;