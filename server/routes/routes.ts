import { Context, Router, send } from "../config/deps.ts";
import { log } from "../utils/utils.ts";
import { createManifest } from "../config/manifest.ts";
import { handleTrendingRequest } from "../handlers/handleTrendingMoviesRequest.ts";
import { handleCatalogRequest } from "../handlers/handleCatalogRequest.ts";
import { googleKeyMiddleware } from "../middleware/googleKeyMiddleware.ts";
import { searchParamMiddleware } from "../middleware/searchParamMiddleware.ts";
import { setMovieType, setSeriesType } from "../middleware/setTypeMiddleware.ts";
import type {
  AppContext,
  MovieCatalogParams,
  TrendingParams,
  ManifestParams,
} from "../config/types/types.ts";

import { redis } from "../config/redisCache.ts";

import { tmdbHealthCheck } from "../services/tmdb.ts";
import { cinemetaHealthCheck } from "../services/cinemeta.ts";
import { rpdbHealthCheck } from "../services/rpdb.ts";

import { handleTraktWatchlistRequest } from "../handlers/handleWatchlistRequest.ts";
import { handleTraktFavoritesRequest } from "../handlers/handleTraktFavoritesRequest.ts";


const catalogMiddleware = [
  googleKeyMiddleware,
  searchParamMiddleware,
];

function serveFile(ctx: Context, filename: string, root: string, options: { cache?: string, contentType?: string } = {}) {
  if (options.contentType) {
    ctx.response.headers.set("Content-Type", options.contentType);
  }
  if (options.cache) {
    ctx.response.headers.set("Cache-Control", options.cache);
  }
  return send(ctx, filename, { root });
}

const handleSearch = async (ctx: Context) => {
  const { searchQuery, type } = ctx.state;
  log(`Received catalog request for query: ${searchQuery} and type: ${type}`);
  await handleCatalogRequest(ctx);
};

const handleTrending = (ctx: AppContext<TrendingParams>) => handleTrendingRequest(ctx);
const handleTraktRecent = (ctx: Context) => handleTraktWatchlistRequest(ctx);
const handleTraktFavorite = (ctx: Context) => handleTraktFavoritesRequest(ctx);


const handleManifest = async (ctx: Context) => {
  const { traktKey, trendingCatalogs, traktCatalogs } = ctx.state;


  log("Serving manifest");

  if (redis) await redis.incr("manifest_requests");

  const manifest = await createManifest({ traktKey: traktKey, trending: !!trendingCatalogs, traktCatalogs: !!traktCatalogs });

  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.body = manifest;
};


const router = new Router();

router.get<MovieCatalogParams>(
  "/:keys?/catalog/movie/ai-movies/:searchParam",
  setMovieType,
  ...catalogMiddleware,
  handleSearch);
router.get<MovieCatalogParams>(
  "/:keys?/catalog/series/ai-tv/:searchParam",
  setSeriesType,
  ...catalogMiddleware,
  handleSearch);

router.get<TrendingParams>(
  "/:keys?/catalog/movie/ai-trending-movies.json",
  setMovieType,
  googleKeyMiddleware,
  handleTrending);
router.get<TrendingParams>(
  "/:keys?/catalog/series/ai-trending-tv.json",
  setSeriesType,
  googleKeyMiddleware,
  handleTrending);

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

router.get("/images/:filename", async (ctx) => {
  const { filename } = ctx.params;
  ctx.response.status = 200;
  await serveFile(ctx, filename, `${Deno.cwd()}/configure/dist/images`, { cache: "public, max-age=86400" });
});

router.get("/images/icons/:filename", async (ctx) => {
  const { filename } = ctx.params;
  await serveFile(ctx, filename, `${Deno.cwd()}/configure/dist/images/icons`, { cache: "public, max-age=86400" });
});

router.get("/assets/:path+", async (ctx) => {
  const filePath = ctx.params.path;

  if (!filePath) {
    ctx.response.status = 400;
    return;
  }

  try {
    await send(ctx, filePath, {
      root: `${Deno.cwd()}/configure/dist/assets`,
    });
  } catch (error) {
    console.error(`Error serving static file: ${filePath}`, error);
  }
});

router.get("/:keys?/configure", async (ctx: Context) => {
  ctx.response.headers.set("Cache-Control", "no-cache"); 
 await send(ctx, "index.html", {
   root: `${Deno.cwd()}/configure/dist`,
 });
});

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

export default router;