import { Router, type RouterContext } from "./config/deps.ts";
import { GEMINI_API_KEY } from "./config/env.ts";
import { manifest } from "./config/manifest.ts";
import { handleCatalogRequest } from "./handlers/handleCatalogRequest.ts";
import { badWordsFilter } from "./utils/badWordsFilter.ts";
import { isValidGeminiApiKey } from "./utils/isValidGeminiApiKey.ts";

type CatalogContext = RouterContext<
  "/:googleKey/catalog/movie/ai-movies/:searchParam",
  { googleKey: string; searchParam: string }
>;

type ManifestContext = RouterContext<
  "/:googleKey/manifest.json",
  { googleKey: string }
>;

const router = new Router();

router.get("/:googleKey/catalog/movie/ai-movies/:searchParam", async (ctx: CatalogContext) => {
  let googleKey = ctx.params.googleKey!;
  const rawParam = ctx.params.searchParam!;

  if (!rawParam.startsWith('search=') || !rawParam.endsWith('.json')) ctx.throw(400, 'Invalid parameter format');
  if (!isValidGeminiApiKey(googleKey)) googleKey = GEMINI_API_KEY;
  
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");
  if (badWordsFilter(searchQuery)) ctx.throw(403, "Sex related content is not allowed");

  console.log(`[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`);
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/:googleKey/manifest.json", (ctx: ManifestContext) => {
  const _googleKey = ctx.params.googleKey!;

  console.log(`[${new Date().toISOString()}] Serving manifest`);
  ctx.response.headers.set("Cache-Control", "max-age=86400");

  const { behaviorHints, ...manifestWithoutBehavior } = manifest;
  ctx.response.body = manifestWithoutBehavior;
});

router.get("/manifest.json", (ctx) => {
  console.log(`[${new Date().toISOString()}] Serving manifest`);

  ctx.response.headers.set("Cache-Control", "max-age=86400");
  ctx.response.body = manifest;
}); 

router.get("/configure", async (ctx) => {
  ctx.response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

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