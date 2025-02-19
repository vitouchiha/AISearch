import { semanticCache } from "../config/semanticCache.ts";
import { redis } from "../config/redisCache.ts";
import type { Context } from "../config/deps.ts";
import { SEARCH_COUNT, NO_CACHE } from "../config/env.ts";
import { log, logError } from "../utils/utils.ts";

import { getMovieRecommendations } from "../services/ai.ts";
import { getTmdbDetailsByName } from "../services/tmdb.ts";
import { buildMeta } from "../utils/buildMeta.ts";
import type { Meta, Recommendation } from "../config/types/types.ts";

import { updateRpdbPosters } from "../services/rpdb.ts";

// Derive a boolean flag for caching
const useCache = NO_CACHE !== "true";

export const handleCatalogRequest = async (
  ctx: Context,
  searchQuery: string,
  type: string,
  googleKey: string,
  rpdbKey?: string,
) => {
  try {
    if (!searchQuery) throw new Error("No search query provided");

    if (useCache && semanticCache) {
      const cachedResult = await semanticCache.get(`${type}:${searchQuery}`);
      if (cachedResult) {
        let parsed;
        try {
          parsed = JSON.parse(cachedResult);
        } catch (error) {
          logError("Error parsing cached result:", error);
          parsed = [];
        }
        const cachedMetas: Meta[] = Array.isArray(parsed) ? parsed : [];

        if (rpdbKey) {
          await updateRpdbPosters(cachedMetas, rpdbKey);
        }

        log(`Cache hit for query: (${type}) ${searchQuery}`);
        ctx.response.body = { metas: cachedMetas };
        return;
      }
    }

    const movieNames = await getMovieRecommendations(
      searchQuery,
      type,
      googleKey,
    );
    let fromCacheCount = 0,
      fromTmdbCount = 0,
      cacheSetCount = 0;

    const metasWithPossibleNull = await Promise.all(
      movieNames.map(async (movieName, index) => {
        log(
          `Processing recommendation ${index + 1} for ${type}: ${movieName}`,
        );

        const { data: tmdbData, fromCache, cacheSet } =
          await getTmdbDetailsByName(movieName, type);

        if (fromCache) fromCacheCount++;
        else fromTmdbCount++;
        if (cacheSet) cacheSetCount++;

        const meta = buildMeta(
          { imdb_id: tmdbData.id } as Recommendation,
          tmdbData,
          type,
        );
        return meta;
      }),
    );

    const metas = metasWithPossibleNull.filter(
      (meta): meta is Meta =>
        meta !== null &&
        typeof meta.poster === "string" &&
        meta.poster.trim() !== "",
    );

    if (useCache && redis && semanticCache) {
      if (metas.length > 0) {
        const trendingKey =
          type === "movie" ? "trendingmovies" : "trendingseries";
        await redis.lpush(trendingKey, JSON.stringify(metas[0]));
        await redis.ltrim(trendingKey, 0, SEARCH_COUNT - 1);
      }

      await semanticCache.set(
        `${type}:${searchQuery}`,
        JSON.stringify(metas),
      );

      log(`${fromCacheCount} ${type}(s) returned from cache.`);
      log(`${fromTmdbCount} ${type}(s) fetched from TMDB.`);
      log(`${cacheSetCount} ${type}(s) added to cache.`);
    }

    if (rpdbKey) {
      await updateRpdbPosters(metas, rpdbKey);
    }

    ctx.response.body = { metas };
  } catch (error: unknown) {
    logError(`Error:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Failed to generate recommendations",
      details: error instanceof Error
        ? error.message
        : "An unknown error occurred.",
    };
  }
};
