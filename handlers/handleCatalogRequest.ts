import { semanticCache } from "../config/semanticCache.ts";
import { redis } from "../config/redisCache.ts";
import type { Context } from "../config/deps.ts";
import { DEV_MODE } from "../config/env.ts";

import { getMovieRecommendations } from "../services/ai.ts";
import { getTmdbDetailsByName } from "../services/tmdb.ts";
import { buildMeta } from "../utils/buildMeta.ts";
import type { Recommendation, Meta } from "../config/types.ts";

const MAX_CACHE_ENTRIES = 20;
const TRENDING_MOVIES_LIST = "trendingmovies";

export const handleCatalogRequest = async (ctx: Context, query: string, googleKey: string) => {
  try {
    const searchQuery = query || (ctx.request.url.searchParams.get("search") ?? "");
    if (!searchQuery) throw new Error("No search query provided");

    const cachedResult = await semanticCache.get(searchQuery);
    if (cachedResult) {
      console.log(`[${new Date().toISOString()}] Cache hit for query: ${searchQuery}`);
      ctx.response.headers.set("Cache-Control", "max-age=3600");
      ctx.response.body = JSON.parse(cachedResult);
      return;
    }

    const movieNames = await getMovieRecommendations(searchQuery, googleKey);
    const metasWithPossibleNull = await Promise.all(
      movieNames.map(async (movieName, index) => {
        DEV_MODE && console.log(`[${new Date().toISOString()}] Processing recommendation ${index + 1} for movie: ${movieName}`);
        
        const tmdbData = await getTmdbDetailsByName(movieName);
        return buildMeta({ imdb_id: tmdbData.id } as Recommendation, tmdbData);
      })
    );

    const metas = metasWithPossibleNull.filter((meta): meta is Meta => meta !== null);
    if (metas[0]) {
      await redis.lpush(TRENDING_MOVIES_LIST, JSON.stringify(metas[0]));
      await redis.ltrim(TRENDING_MOVIES_LIST, 0, MAX_CACHE_ENTRIES - 1);
    }

    const responsePayload = { metas };

    await semanticCache.set(searchQuery, JSON.stringify(responsePayload));

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