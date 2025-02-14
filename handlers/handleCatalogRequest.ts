import { semanticCache } from "../config/semanticCache.ts";
import { redis } from "../config/redisCache.ts";
import type { Context } from "../config/deps.ts";
import { DEV_MODE } from "../config/env.ts";

import { getMovieRecommendations } from "../services/ai.ts";
import { getTmdbDetailsByName } from "../services/tmdb.ts";
import { buildMeta } from "../utils/buildMeta.ts";
import type { Recommendation, Meta } from "../config/types/types.ts";

const MAX_CACHE_ENTRIES = 20;

export const handleCatalogRequest = async (ctx: Context, query: string, type: string, googleKey: string) => {
  try {
    const searchQuery = query || (ctx.request.url.searchParams.get("search") ?? "");
    if (!searchQuery) throw new Error("No search query provided");

    const cachedResult = await semanticCache.get(`${type}:${searchQuery}`);
    if (cachedResult) {
      console.log(`[${new Date().toISOString()}] Cache hit for query: (${type}) ${searchQuery}`);
      ctx.response.headers.set("Cache-Control", "max-age=3600");
      ctx.response.body = JSON.parse(cachedResult);
      return;
    }

    const movieNames = await getMovieRecommendations(searchQuery, type, googleKey);

    let fromCacheCount = 0, fromTmdbCount = 0, cacheSetCount = 0;

    const metasWithPossibleNull = await Promise.all(
      movieNames.map(async (movieName, index) => {
        DEV_MODE && console.log(`[${new Date().toISOString()}] Processing recommendation ${index + 1} for movie: ${movieName}`);

        const { data: tmdbData, fromCache, cacheSet } = await getTmdbDetailsByName(movieName, type);

        if (fromCache) fromCacheCount++;
        else fromTmdbCount++;
        if (cacheSet) cacheSetCount++;

        return buildMeta({ imdb_id: tmdbData.id } as Recommendation, tmdbData, type);
      }),
    );

    const metas = metasWithPossibleNull.filter((meta): meta is Meta => meta !== null);
    const trendingKey = type === "movie" ? "trendingmovies" : "trendingseries";
    if (metas[0]) {
      await redis.lpush(trendingKey, JSON.stringify(metas[0]));
      await redis.ltrim(trendingKey, 0, MAX_CACHE_ENTRIES - 1);
    }

    const responsePayload = { metas };
    await semanticCache.set(`${type}:${searchQuery}`, JSON.stringify(responsePayload));

    console.log(`${fromCacheCount} ${type} returned from cache.`);
    console.log(`${fromTmdbCount} ${type} fetched from TMDB.`);
    console.log(`${cacheSetCount} ${type} added to cache.`);

    ctx.response.headers.set("Cache-Control", "max-age=3600");
    ctx.response.body = responsePayload;

  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null && "message" in error) {
      errorMessage = String(error.message);
    }
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Failed to generate recommendations",
      details: errorMessage,
    };
  }
};