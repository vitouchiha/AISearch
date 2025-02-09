import { Router, Context } from "./config/deps.ts";
import { GEMINI_API_KEY } from "./config/env.ts";
import { manifest } from "./config/manifest.ts";
import { handleCatalogRequest } from "./handlers/handleCatalogRequest.ts";

const router = new Router();

router.get("/:googleKey/catalog/movie/ai-movies/:searchParam", async (ctx: Context) => {
  let googleKey = ctx.params.googleKey;

  if(googleKey === 'default') googleKey = GEMINI_API_KEY;
  
  const rawParam = ctx.params.searchParam || "";
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");
  console.log(
    `[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`
  );
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/catalog/movie/ai-movies/:searchParam", async (ctx: Context) => {
  const googleKey = GEMINI_API_KEY;
  const rawParam = ctx.params.searchParam || "";
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");

  if (!googleKey) ctx.throw(400, "Google key is required");

  console.log(
    `[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`
  );
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/:googleKey/manifest.json", (ctx: Context) => {
  const googleKey = ctx.params.googleKey;
  console.log(
    `[${new Date().toISOString()}] Serving manifest`
  );
  ctx.response.headers.set("Cache-Control", "max-age=86400");

  const { behaviorHints, ...manifestWithoutBehavior } = manifest;
  ctx.response.body = manifestWithoutBehavior;
});

router.get("/manifest.json", (ctx: Context) => {
  console.log(`[${new Date().toISOString()}] Serving manifest`);
  ctx.response.headers.set("Cache-Control", "max-age=86400");
  ctx.response.body = manifest;
});

router.get("/configure", async (ctx: Context) => {
  const html = await Deno.readTextFile("./static/configure.html");
  ctx.response.headers.set("Content-Type", "text/html");
  ctx.response.body = html;
});

router.get("/", (ctx: Context) => {
  ctx.response.redirect('/configure');
});

export default router;