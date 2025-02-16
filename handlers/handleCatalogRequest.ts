import { semanticCache } from "../config/semanticCache.ts";
import { redis } from "../config/redisCache.ts";
import type { Context } from "../config/deps.ts";
import { DEV_MODE, SEARCH_COUNT } from "../config/env.ts";

import { getMovieRecommendations } from "../services/ai.ts";
import { getTmdbDetailsByName } from "../services/tmdb.ts";
import { buildMeta } from "../utils/buildMeta.ts";
import type { Recommendation, Meta } from "../config/types/types.ts";

import { getRpdbPoster } from "../services/rpdb.ts";

export const handleCatalogRequest = async (ctx: Context, searchQuery: string, type: string, googleKey: string, rpdbKey?: string) => {
  try {
    if (!searchQuery) throw new Error("No search query provided");

    const cachedResult = await semanticCache.get(`${type}:${searchQuery}`);
    if (cachedResult) {
      let parsed;
      try {
        parsed = JSON.parse(cachedResult);
      } catch (error) {
        console.error("Error parsing cached result:", error);
        parsed = [];
      }

      // Ensure that parsed is actually an array
      const cachedMetas: Meta[] = Array.isArray(parsed) ? parsed : [];

      if (rpdbKey) {
        await Promise.all(
          cachedMetas.map(async (meta) => {
            if (meta.id) {
              try {
                const rpdbPoster = await getRpdbPoster(meta.id, rpdbKey);
                if (rpdbPoster?.poster) meta.poster = rpdbPoster.poster;
              } catch (error) {
                console.error(`Error fetching rpdb poster for id ${meta.id}:`, error);
              }
            }
          })
        );
      }

      console.log(
        `[${new Date().toISOString()}] Cache hit for query: (${type}) ${searchQuery}`
      );
      ctx.response.body = { metas: cachedMetas };
      return;
    }

    const movieNames = await getMovieRecommendations(searchQuery, type, googleKey);
    let fromCacheCount = 0, fromTmdbCount = 0, cacheSetCount = 0;

    const metasWithPossibleNull = await Promise.all(
      movieNames.map(async (movieName, index) => {
        DEV_MODE &&
          console.log(
            `[${new Date().toISOString()}] Processing recommendation ${index + 1} for movie: ${movieName}`
          );

        const { data: tmdbData, fromCache, cacheSet } = await getTmdbDetailsByName(movieName, type);

        if (fromCache) fromCacheCount++;
        else fromTmdbCount++;
        if (cacheSet) cacheSetCount++;

        const meta = buildMeta(
          { imdb_id: tmdbData.id } as Recommendation,
          tmdbData,
          type,
        );
        return meta;
      })
    );

    const metas = metasWithPossibleNull.filter(
      (meta): meta is Meta => meta !== null && typeof meta.poster === "string" && meta.poster.trim() !== ""
    );

    if (metas.length > 0) {
      const trendingKey = type === "movie" ? "trendingmovies" : "trendingseries";
      await redis.lpush(trendingKey, JSON.stringify(metas[0]));
      await redis.ltrim(trendingKey, 0, SEARCH_COUNT - 1);
    }

    await semanticCache.set(`${type}:${searchQuery}`, JSON.stringify(metas));

    console.log(`${fromCacheCount} ${type}(s) returned from cache.`);
    console.log(`${fromTmdbCount} ${type}(s) fetched from TMDB.`);
    console.log(`${cacheSetCount} ${type}(s) added to cache.`);

    // Before sending the response, override meta.poster with rpdbPoster if rpdbKey is provided.
    if (rpdbKey) {
      await Promise.all(
        metas.map(async (meta) => {
          if (meta.id) {
            try {
              const rpdbPoster = await getRpdbPoster(meta.id, rpdbKey);
              if (rpdbPoster?.poster) meta.poster = rpdbPoster.poster;
            } catch (error) {
              console.error(`Error fetching rpdb poster for id ${meta.id}:`, error);
            }
          }
        })
      );
    }

    ctx.response.body = { metas };

  } catch (error: unknown) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Failed to generate recommendations",
      details: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
};