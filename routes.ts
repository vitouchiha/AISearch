import { Router } from "./config/deps.ts";
import { ROOT_URL, DEV_MODE } from "./config/env.ts";
import { log } from "./utils/utils.ts";
import { manifest } from "./config/manifest.ts";
import { handleTrendingRequest } from "./handlers/handleTrendingMoviesRequest.ts";
import { handleCatalogRequest } from "./handlers/handleCatalogRequest.ts";
import { googleKeyMiddleware } from "./middleware/googleKeyMiddleware.ts";
import { searchParamMiddleware } from "./middleware/searchParamMiddleware.ts";
import { setMovieType, setSeriesType } from "./middleware/setTypeMiddleware.ts";
import type {
  AppContext,
  CatalogContext,
  ConfigureContext,
  ManifestContext,
  MovieCatalogParams,
  TrendingParams,
  ManifestParams,
} from "./config/types/types.ts";
import { redis } from "./config/redisCache.ts";

const catalogMiddleware = [
  googleKeyMiddleware,
  searchParamMiddleware,
];

const handleSearch = async (ctx: CatalogContext) => {
  const { searchQuery, googleKey, rpdbKey, type } = ctx.state;
  if (!searchQuery || !googleKey || !type) {
    return ctx.response.status = 500, ctx.response.body = { error: "Internal server error: missing required state." };
  }
  log(`Received catalog request for query: ${searchQuery} and type: ${type}`);
  await handleCatalogRequest(ctx, searchQuery, type, googleKey, rpdbKey);
};

const handleTrending = (ctx: AppContext<TrendingParams>) => handleTrendingRequest(ctx);

const handleManifest = async (ctx: ManifestContext) => {
  log("Serving manifest");
  await redis.incr("manifest_requests");
  ctx.response.body = manifest;
};

const handleConfigure = async (ctx: ConfigureContext) => {
  try {
    const installs = await redis.get("manifest_requests") || "0";
    const dbSize: number = await redis.dbsize();
    const htmlContent = await Deno.readTextFile("./views/configure.html");
    const html = htmlContent
      .replace("{{ROOT_URL}}", ROOT_URL)
      .replace("{{VERSION}}", manifest.version)
      .replace("{{INSTALLS}}", String(installs))
      .replace("{{DB_SIZE}}", String(dbSize))
      .replace("{{DEV_MODE}}", DEV_MODE ? "DEVELOPMENT MODE" : "");

    ctx.response.headers.set("Content-Type", "text/html");
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

router.get<ManifestParams>("/manifest.json", googleKeyMiddleware, handleManifest);
router.get("/configure", handleConfigure);
router.get("/", (ctx) => ctx.response.redirect("/configure"));

router.get("/favicon.ico", (ctx) => {
  ctx.response.status = 200; 
  ctx.response.headers.set("Content-Type", "text/plain");
  ctx.response.body = "Not Found";
});

export default router;