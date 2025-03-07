import { Context, Router, send } from "../config/deps.ts";
import { ROOT_URL, DEV_MODE, NO_CACHE } from "../config/env.ts";
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

const useCache = NO_CACHE !== "true";
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

const handleManifest = async (ctx: ManifestContext) => {
  const { traktKey } = ctx.state;

  log("Serving manifest");

  const trendingParam = ctx.request.url.searchParams.get("trending");
  const trending = trendingParam === null ? true : trendingParam === "true";

  if (useCache && redis) {
    await redis.incr("manifest_requests");
  }
  
  const manifest = createManifest(trending, !!traktKey);
  
  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.body = manifest;
};

const handleConfigure = async (ctx: ConfigureContext) => {
  try {
    const filePromise = Deno.readTextFile("./views/configure.html");

    let installs: string = "NO CACHE";
    let dbSize: string = "NO CACHE";
    let vectorCount: string = "NO CACHE";

    if (useCache && redis && index) {
      const [installsVal, dbSizeVal, indexInfo] = await Promise.all([
        redis.get("manifest_requests"),
        redis.dbsize(),
        index.info()
      ]);
      installs = String(installsVal) || "0";
      dbSize = String(dbSizeVal) || "0";
      vectorCount = String(indexInfo.vectorCount) || "0";
    }

    const htmlContent = await filePromise;

    const html = htmlContent
      .replace("{{ROOT_URL}}", ROOT_URL)
      .replace("{{VERSION}}", STATIC_MANIFEST.version)
      .replace("{{INSTALLS}}", installs)
      .replace("{{DB_SIZE}}", dbSize)
      .replace("{{VECTOR_COUNT}}", vectorCount)
      .replace("{{DEV_MODE}}", DEV_MODE ? "DEVELOPMENT MODE" : "");

    ctx.response.headers.set("Content-Type", "text/html");
    //ctx.response.headers.set("Cache-Control", "public, max-age=86400");
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

router.get<ManifestParams>("/:keys?/manifest.json", googleKeyMiddleware, handleManifest);


router.get("/configure.js", async (ctx) => {
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
router.get("/", (ctx) => ctx.response.redirect("/configure"));

router.get("/health", async (ctx) => {
  const health = {
    redis: true,
    vector: true,
    tmdb: true,
    cinemeta: true,
    ratePosters: true,
  };

  // Internal checks: Redis and Vector index
  if (useCache && redis && index) {
    const [redisResult, indexResult] = await Promise.allSettled([
      redis.ping(),
      index.info(),
    ]);

    if (redisResult.status === "fulfilled") {
      health.redis = redisResult.value === "PONG";
    } else {
      console.error("Redis health check failed:", redisResult.reason);
      health.redis = false;
    }

    if (indexResult.status === "fulfilled") {
      health.vector = indexResult.value.vectorCount !== null;
    } else {
      console.error("Vector index health check failed:", indexResult.reason);
      health.vector = false;
    }
  }

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
      redis: health.redis ? "ok" : "failed",
      vector: health.vector ? "ok" : "failed",
      tmdb: health.tmdb ? "ok" : "failed",
      cinemeta: health.cinemeta ? "ok" : "failed",
      ratePosters: health.ratePosters ? "ok" : "failed",
    });
  }
});
router.get("/images/logo.webp", (ctx) => {
  ctx.response.status = 200;
  ctx.response.headers.set("Content-Type", "image/webp");
  ctx.response.headers.set("Cache-Control", "public, max-age=86400");
  ctx.response.body = Deno.readFileSync("./views/images/filmwhisper.webp");
});
router.get("/images/background.webp", (ctx) => {
  ctx.response.status = 200;
  ctx.response.headers.set("Content-Type", "image/webp");
  ctx.response.headers.set("Cache-Control", "public, max-age=86400");
  ctx.response.body = Deno.readFileSync("./views/images/fw-background.webp");
});
router.get("/images/icons/:filename", async (ctx) => {
  const filename = ctx.params.filename;
  await send(ctx, filename, {
    root: `${Deno.cwd()}/views/images/icons`,
  });
});

export default router;