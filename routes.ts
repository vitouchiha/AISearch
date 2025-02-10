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

async function applyRateLimit(ctx: any, identifier: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  ctx.response.headers.set("X-RateLimit-Limit", String(limit));
  ctx.response.headers.set("X-RateLimit-Remaining", String(remaining));
  ctx.response.headers.set("X-RateLimit-Reset", String(reset));

  if (!success) {
    ctx.response.status = 429;
    ctx.response.body = "Rate limit exceeded. Please try again later.";
    return false;
  }
  return true;
}

function isValidGeminiApiKey(key: string): boolean {
  if (!key) return false;
  if (typeof key !== 'string') return false;

  const keyFormat = /^AIza[a-zA-Z0-9_-]{35}$/; // Updated regex
  if (!keyFormat.test(key)) return false;

  return true;
}

const router = new Router();

router.get("/:googleKey/catalog/movie/ai-movies/:searchParam", async (ctx: CatalogContext) => {
  let googleKey = ctx.params.googleKey!;
  const rawParam = ctx.params.searchParam!;
  const identifier = ctx.request.headers.get("cf-connecting-ip") || ctx.request.ip;
  if (!await applyRateLimit(ctx, identifier)) return;

  if (!rawParam.startsWith('search=') || !rawParam.endsWith('.json')) {
    ctx.throw(400, 'Invalid parameter format');
  }

  if (!isValidGeminiApiKey(googleKey)) googleKey = GEMINI_API_KEY;
  
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");
  console.log(`[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`);
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/catalog/movie/ai-movies/:searchParam", async (ctx: SearchParamContext) => {
  const googleKey = GEMINI_API_KEY;
  const rawParam = ctx.params.searchParam!;
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");
  const identifier = ctx.request.headers.get("cf-connecting-ip") || ctx.request.ip;
  if (!await applyRateLimit(ctx, identifier)) return;

  console.log(`[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`);
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/:googleKey/manifest.json", async (ctx: ManifestContext) => {
  const _googleKey = ctx.params.googleKey!;
  const identifier = ctx.request.headers.get("cf-connecting-ip") || ctx.request.ip;
  if (!await applyRateLimit(ctx, identifier)) return;

  console.log(`[${new Date().toISOString()}] Serving manifest`);
  ctx.response.headers.set("Cache-Control", "max-age=86400");

  const { behaviorHints, ...manifestWithoutBehavior } = manifest;
  ctx.response.body = manifestWithoutBehavior;
});

router.get("/manifest.json", async (ctx) => {
  console.log(`[${new Date().toISOString()}] Serving manifest`);

  const identifier = ctx.request.headers.get("cf-connecting-ip") || ctx.request.ip;
  if (!await applyRateLimit(ctx, identifier)) return;

  ctx.response.headers.set("Cache-Control", "max-age=86400");
  ctx.response.body = manifest;
}); 

router.get("/configure", async (ctx) => {
  ctx.response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

  const identifier = ctx.request.headers.get("cf-connecting-ip") || ctx.request.ip;
  if (!await applyRateLimit(ctx, identifier)) return;

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