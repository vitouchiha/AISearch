import { Router } from "./config/deps.ts";
import { DEV_MODE } from "./config/env.ts";

import { manifest } from "./config/manifest.ts";

import { handleTrendingRequest } from "./handlers/handleTrendingMoviesRequest.ts";
import { handleCatalogRequest } from "./handlers/handleCatalogRequest.ts";

import { googleKeyMiddleware } from "./middleware/googleKeyMiddleware.ts";
import { searchParamMiddleware } from "./middleware/searchParamMiddleware.ts";

import type { ConfigureContext, CatalogContext, TrendingContext, ManifestContext,
              MovieCatalogParams, TrendingParams, ManifestParams } from "./config/types.ts";  

const handleSearch = async (ctx: CatalogContext) => {
  const { searchQuery, googleKey } = ctx.state;
  if (!searchQuery || !googleKey) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error: missing required state." };
    return;
  }
  DEV_MODE && console.log(`[${new Date().toISOString()}] Received catalog request for query: ${searchQuery}`);
  await handleCatalogRequest(ctx, searchQuery, googleKey);
};

const handleTrending = async (ctx: TrendingContext) => {
  const { googleKey } = ctx.state;
  if (!googleKey) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error: missing google key." };
    return;
  }
  await handleTrendingRequest(ctx);
};

const handleManifest = (ctx: ManifestContext) => {
  console.log(`[${new Date().toISOString()}] Serving manifest`);
  ctx.response.headers.set("Cache-Control", "max-age=86400");
  ctx.response.body = manifest;
};

const router = new Router();

router.use(googleKeyMiddleware);

router.get<MovieCatalogParams>("/:googleKey?/catalog/movie/ai-movies/:searchParam",
  searchParamMiddleware,
  handleSearch,
);

router.get<TrendingParams>("/:googleKey?/catalog/movie/ai-movies.json", handleTrending);
router.get<ManifestParams>("/:googleKey?/manifest.json", handleManifest);

router.get("/configure", async (ctx: ConfigureContext) => {
  ctx.response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

  await ctx.send({
    root: `${Deno.cwd()}/static`,
    path: "configure.html",
  });
});

router.get("/", (ctx) => ctx.response.redirect("/configure"));

export default router;
