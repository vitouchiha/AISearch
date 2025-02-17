import { Router } from "./config/deps.ts";
import { ROOT_URL, DEV_MODE } from "./config/env.ts";

import { manifest } from "./config/manifest.ts";

import { handleTrendingRequest } from "./handlers/handleTrendingMoviesRequest.ts";
import { handleCatalogRequest } from "./handlers/handleCatalogRequest.ts";

import { googleKeyMiddleware } from "./middleware/googleKeyMiddleware.ts";
import { searchParamMiddleware } from "./middleware/searchParamMiddleware.ts";
import { setMovieType, setSeriesType } from "./middleware/setTypeMiddleware.ts";

import type {
  CatalogContext,
  ConfigureContext,
  ManifestContext,
  ManifestParams,
  MovieCatalogParams,
  TrendingContext,
  TrendingParams,
} from "./config/types/types.ts";

const handleSearch = async (ctx: CatalogContext) => {
  const { searchQuery, googleKey, rpdbKey, type } = ctx.state;
  if (!searchQuery || !googleKey || !type) {
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Internal server error: missing required state.",
    };
    return;
  }

  DEV_MODE &&
    console.log(
      `[${
        new Date().toISOString()
      }] Received catalog request for query: ${searchQuery} and type: ${type}`,
    );
  await handleCatalogRequest(ctx, searchQuery, type, googleKey, rpdbKey);
};

const handleTrending = async (ctx: TrendingContext) => {
  await handleTrendingRequest(ctx);
};

const handleManifest = (ctx: ManifestContext) => {
  console.log(`[${new Date().toISOString()}] Serving manifest`);
  ctx.response.body = manifest;
};

const router = new Router();

router.get<MovieCatalogParams>(
  "/:keys?/catalog/movie/ai-movies/:searchParam",
  setMovieType,
  googleKeyMiddleware,
  searchParamMiddleware,
  handleSearch,
);

router.get<MovieCatalogParams>(
  "/:keys?/catalog/series/ai-tv/:searchParam",
  setSeriesType,
  googleKeyMiddleware,
  searchParamMiddleware,
  handleSearch,
);

// For trending endpoints:
router.get<TrendingParams>(
  "/:keys?/catalog/movie/ai-trending-movies.json",
  setMovieType,
  googleKeyMiddleware,
  handleTrending,
);

router.get<TrendingParams>(
  "/:keys?/catalog/series/ai-trending-tv.json",
  setSeriesType,
  googleKeyMiddleware,
  handleTrending,
);

// And for manifest:
router.get<ManifestParams>(
  "/:keys?/manifest.json",
  handleManifest,
  googleKeyMiddleware,
);

router.get("/configure", async (ctx: ConfigureContext) => {
  try {
    let html = await Deno.readTextFile("./views/configure.html");
    html = html
              .replace("{{ROOT_URL}}", ROOT_URL)
              .replace("{{VERSION}}", manifest.version)
              .replace("{{DEV_MODE}}", DEV_MODE ? "DEVELOPMENT MODE" : "");

    ctx.response.headers.set("Content-Type", "text/html");
    ctx.response.body = html;
  } catch (error) {
    console.error("Error serving configure page:", error);
    ctx.response.status = 500;
    ctx.response.body = "Internal Server Error";
  }
});

router.get("/", (ctx) => ctx.response.redirect("/configure"));

export default router;
