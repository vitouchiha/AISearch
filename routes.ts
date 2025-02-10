import { Router, type RouterContext } from "./config/deps.ts";
import { GEMINI_API_KEY, WEBHOOK_SECRET, PORT } from "./config/env.ts";
import { manifest } from "./config/manifest.ts";
import { handleCatalogRequest } from "./handlers/handleCatalogRequest.ts";

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

  if (googleKey === 'default') googleKey = GEMINI_API_KEY;
  
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");
  console.log(`[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`);
  await handleCatalogRequest(ctx, searchQuery, googleKey);
});

router.get("/catalog/movie/ai-movies/:searchParam", async (ctx: SearchParamContext) => {
  const googleKey = GEMINI_API_KEY;
  const rawParam = ctx.params.searchParam!;
  const searchQuery = rawParam.replace(/^search=/, "").replace(/\.json$/, "");

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

router.post("/git-webhook", async (ctx) => {
  const secret = ctx.request.headers.get("x-webhook-secret");
  if (!secret || secret !== WEBHOOK_SECRET) {
    console.warn("Invalid secret");
    ctx.response.status = 401;
    ctx.response.body = "Unauthorized";
    return;
  }

  try {
    const data = await ctx.request.body().value;
    const imageTag = data.image_tag;

    if (!imageTag) {
      ctx.response.status = 400;
      ctx.response.body = "Missing image_tag in payload";
      return;
    }

    const dockerPull = new Deno.Command("docker", { args: ["pull", imageTag] }).output();
    const dockerComposePull = new Deno.Command("docker-compose", { args: ["pull", "ai-stremio-search"] }).output();
    const dockerComposeUp = new Deno.Command("docker-compose", { args: ["up", "-d", "ai-stremio-search"] }).output();

    const results = await Promise.all([dockerPull, dockerComposePull, dockerComposeUp]);
    results.forEach(result => {
        if (!result.success) {
            console.error("Docker command failed:", new TextDecoder().decode(result.stderr));
        }
    })


    console.log(`Deployment triggered for ${imageTag}`);
    ctx.response.body = "Deployment triggered";
    ctx.response.status = 200;

  } catch (error) {
    console.error("Error processing webhook:", error);
    ctx.response.status = 500;
    ctx.response.body = "Error processing webhook";
  }
});

export default router;