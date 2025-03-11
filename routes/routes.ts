import { Context, Router, send } from "../config/deps.ts";
import { ROOT_URL, DEV_MODE } from "../config/env.ts";
import { log } from "../utils/utils.ts";
import { createManifest } from "../config/manifest.ts";
import { handleTrendingRequest } from "../handlers/handleTrendingMoviesRequest.ts";
import { handleCatalogRequest } from "../handlers/handleCatalogRequest.ts";
import { googleKeyMiddleware } from "../middleware/googleKeyMiddleware.ts";
import { searchParamMiddleware } from "../middleware/searchParamMiddleware.ts";
import { setMovieType, setSeriesType } from "../middleware/setTypeMiddleware.ts";
import type {
  AppContext,
  CatalogContext,
  ConfigureContext,
  ManifestContext,
  MovieCatalogParams,
  TrendingParams,
  ManifestParams,
} from "../config/types/types.ts";

import { redis } from "../config/redisCache.ts";
import { index } from "../config/semanticCache.ts";
import { tmdbHealthCheck } from "../services/tmdb.ts";
import { cinemetaHealthCheck } from "../services/cinemeta.ts";
import { rpdbHealthCheck } from "../services/rpdb.ts";

import { handleTraktWatchlistRequest } from "../handlers/handleWatchlistRequest.ts";
import { handleTraktFavoritesRequest } from "../handlers/handleTraktFavoritesRequest.ts";

const STATIC_MANIFEST = createManifest();


const catalogMiddleware = [ 
  googleKeyMiddleware,
  searchParamMiddleware,
];

const handleSearch = async (ctx: CatalogContext) => {
  const { searchQuery, type } = ctx.state;
  log(`Received catalog request for query: ${searchQuery} and type: ${type}`);
  await handleCatalogRequest(ctx);
};

const handleTrending = (ctx: AppContext<TrendingParams>) => handleTrendingRequest(ctx);
const handleTraktRecent = (ctx: Context) => handleTraktWatchlistRequest(ctx);
const handleTraktFavorite = (ctx: Context) => handleTraktFavoritesRequest(ctx);


const handleManifest = async (ctx: ManifestContext) => {
  const { traktKey } = ctx.state;

  log("Serving manifest");

  const trendingParam = ctx.request.url.searchParams.get("trending");
  const trending = trendingParam === null ? true : trendingParam === "true";

  if (redis) await redis.incr("manifest_requests");
  
  const manifest = createManifest(trending, !!traktKey);
  
  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.body = manifest;
};

const handleConfigure = async (ctx: ConfigureContext) => {
  try {
    const filePromise = Deno.readTextFile("./views/configure.html");

    const [
      installsVal,
      dbSizeVal,
      indexInfo,
    ] = await Promise.all([
      redis ? redis.get<string>("manifest_requests") : Promise.resolve(null),
      redis ? redis.dbsize() : Promise.resolve(null),
      index ? index.info() : Promise.resolve(null),
    ]);

    const installs = installsVal || "0";
    const dbSize = (dbSizeVal !== null && dbSizeVal !== undefined)
      ? String(dbSizeVal)
      : "0";

    const vectorCountNumber = indexInfo?.vectorCount ?? 0;
    const vectorCount = vectorCountNumber ? String(vectorCountNumber) : "NO CACHE";

    if (vectorCountNumber > 58000 && index) await index.reset();

    const htmlContent = await filePromise;
    const html = htmlContent
      .replace("{{ROOT_URL}}", ROOT_URL)
      .replace("{{VERSION}}", STATIC_MANIFEST.version)
      .replace("{{INSTALLS}}", installs)
      .replace("{{DB_SIZE}}", dbSize)
      .replace("{{VECTOR_COUNT}}", vectorCount)
      .replace("{{DEV_MODE}}", DEV_MODE ? "DEVELOPMENT MODE" : "");

    ctx.response.headers.set("Content-Type", "text/html");
    ctx.response.headers.set("Cache-Control", "public, max-age=18000"); // Cache for 5 hours
    ctx.response.body = html;
  } catch (error) {
    console.error("Error serving configure page:", error);
    ctx.response.status = 500;
    ctx.response.body = "Internal Server Error";
  }
};



const router = new Router();

router.get<MovieCatalogParams>(
  "/:keys?/catalog/movie/ai-movies/:searchParam",
  setMovieType,
  ...catalogMiddleware,
  handleSearch as unknown as (ctx: AppContext<MovieCatalogParams>) => Promise<void>,
);
router.get<MovieCatalogParams>(
  "/:keys?/catalog/series/ai-tv/:searchParam",
  setSeriesType,
  ...catalogMiddleware,
  handleSearch as unknown as (ctx: AppContext<MovieCatalogParams>) => Promise<void>,
);

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

router.get(
  "/:keys?/catalog/movie/ai-trakt-recent-movie.json",
  setMovieType,
  googleKeyMiddleware,
  handleTraktRecent);

  router.get(
    "/:keys?/catalog/series/ai-trakt-recent-tv.json",
    setSeriesType,
    googleKeyMiddleware,
    handleTraktRecent);

    router.get(
      "/:keys?/catalog/movie/ai-trakt-favorite-movie.json",
      setMovieType,
      googleKeyMiddleware,
      handleTraktFavorite);
    
      router.get(
        "/:keys?/catalog/series/ai-trakt-favorite-tv.json",
        setSeriesType,
        googleKeyMiddleware,
        handleTraktFavorite);

router.get<ManifestParams>("/:keys?/manifest.json", googleKeyMiddleware, handleManifest);


router.get("/configure.js", async (ctx: Context) => {
  try {
    const jsContent = await Deno.readTextFile("./views/script.js");
    const js = jsContent.replace("{{ROOT_URL}}", ROOT_URL);

    ctx.response.headers.set("Content-Type", "application/javascript");
    //ctx.response.headers.set("Cache-Control", "public, max-age=86400");
    ctx.response.body = js;
  } catch (error) {
    console.error("Error serving configure.js:", error);
    ctx.response.status = 500;
    ctx.response.body = "Internal Server Error";
  }
});
router.get("/:keys?/configure", handleConfigure);
router.get("/", (ctx: Context) => ctx.response.redirect("/configure"));

router.get("/health", async (ctx: Context) => {
  const health = {
    tmdb: true,
    cinemeta: true,
    ratePosters: true,
  };

  // External checks run concurrently
  const [tmdbResult, cinemetaResult, ratePostersResult] = await Promise.allSettled([
    tmdbHealthCheck(),
    cinemetaHealthCheck(),
    rpdbHealthCheck(),
  ]);

  health.tmdb = tmdbResult.status === "fulfilled" ? tmdbResult.value : false;
  if (tmdbResult.status !== "fulfilled") {
    console.error("TMDB health check failed:", tmdbResult.reason);
  }

  health.cinemeta = cinemetaResult.status === "fulfilled" ? cinemetaResult.value : false;
  if (cinemetaResult.status !== "fulfilled") {
    console.error("Cinemeta health check failed:", cinemetaResult.reason);
  }

  health.ratePosters = ratePostersResult.status === "fulfilled" ? ratePostersResult.value : false;
  if (ratePostersResult.status !== "fulfilled") {
    console.error("RatePosters health check failed:", ratePostersResult.reason);
  }

  // Overall health status: all services must be healthy
  const allHealthy = Object.values(health).every(status => status);

  if (allHealthy) {
    ctx.response.status = 200;
    ctx.response.headers.set("Content-Type", "text/plain");
    ctx.response.body = "OK";
  } else {
    ctx.response.status = 500;
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.body = JSON.stringify({
      status: "unhealthy",
      tmdb: health.tmdb ? "ok" : "failed",
      cinemeta: health.cinemeta ? "ok" : "failed",
      ratePosters: health.ratePosters ? "ok" : "failed",
    });
  }
});
router.get("/images/logo.webp", (ctx: Context) => {
  ctx.response.status = 200;
  ctx.response.headers.set("Content-Type", "image/webp");
  ctx.response.headers.set("Cache-Control", "public, max-age=86400");
  ctx.response.body = Deno.readFileSync("./views/images/filmwhisper.webp");
});
router.get("/images/background.webp", (ctx: Context) => {
  ctx.response.status = 200;
  ctx.response.headers.set("Content-Type", "image/webp");
  ctx.response.headers.set("Cache-Control", "public, max-age=86400");
  ctx.response.body = Deno.readFileSync("./views/images/fw-background.webp");
});
router.get("/images/bad_apikey.webp", (ctx: Context) => {
  ctx.response.status = 200;
  ctx.response.headers.set("Content-Type", "image/webp");
  ctx.response.headers.set("Cache-Control", "public, max-age=86400");
  ctx.response.body = Deno.readFileSync("./views/images/bad_apikey.webp");
});
router.get("/images/icons/:filename", async (ctx) => {
  const { filename } = ctx.params;
  ctx.response.headers.set("Cache-Control", "public, max-age=86400");
  await send(ctx, filename, {
    root: `${Deno.cwd()}/views/images/icons`,
  });
});

export default router;