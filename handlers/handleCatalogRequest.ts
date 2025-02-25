import { semanticCache } from "../config/semanticCache.ts";
import { redis } from "../config/redisCache.ts";
import {type Context } from "../config/deps.ts";
import { SEARCH_COUNT, NO_CACHE } from "../config/env.ts";
import { log, logError } from "../utils/utils.ts";
import { getMovieRecommendations } from "../services/ai.ts";
import { getTmdbDetailsByName } from "../services/tmdb.ts";
import type { Meta } from "../config/types/meta.ts";
import { updateRpdbPosters } from "../services/rpdb.ts";
import { getProviderInfoFromState } from "../services/aiProvider.ts";
import { pushBatchToQstash } from "../config/qstash.ts";
import type { BackgroundTaskParams } from "../config/types/types.ts";

const useCache = NO_CACHE !== "true";

export const handleCatalogRequest = async (
  ctx: Context
): Promise<void> => {
  const { searchQuery, type, googleKey, openAiKey, tmdbKey, rpdbKey, omdbKey } = ctx.state;

  if (!searchQuery || !type || (!googleKey && !openAiKey)) {
    ctx.response.status = 400;
    ctx.response.body = {
      error: !searchQuery
        ? "Search query is required"
        : !type
        ? "Type is required"
        : "Either Google API key or OpenAI API key is required",
    };
    return;
  }

  const cacheKey = `${type}:${searchQuery}`;
  let metas = [] as Meta[];
  const backgroundUpdateBatch: BackgroundTaskParams[] = [];

  try {
    if (useCache && semanticCache) {
      try {
        const cachedResult = await semanticCache.get(cacheKey);
        if (cachedResult) {
          metas = JSON.parse(cachedResult);
          log(`Cache hit for query: (${type}) ${searchQuery}`);
          if (rpdbKey) await updateRpdbPosters(metas, rpdbKey);
          ctx.response.body = { metas };
          return;
        }
      } catch (error) {
        logError(`Cache read error for ${cacheKey}:`, error);
      }
    }

    const { provider, apiKey } = getProviderInfoFromState(ctx.state);

    const { recommendations: movieNames, lang } = await getMovieRecommendations(
      searchQuery,
      type,
      { provider, apiKey }
    );

    if (!movieNames?.length) {
      ctx.response.body = { metas: [] };
      return;
    }

    const stats = { fromCache: 0, fromTmdb: 0, cacheSet: 0 };

    const metaResults = await Promise.allSettled(
      movieNames.map(async (movieName, index) => {
        log(`Fetching recommendation ${index + 1} for ${type}: ${movieName}`);

        const { data: tmdbData, fromCache, cacheSet } =
          await getTmdbDetailsByName(movieName, lang, type, tmdbKey, omdbKey, backgroundUpdateBatch);

        stats.fromCache += fromCache ? 1 : 0;
        stats.fromTmdb += fromCache ? 0 : 1;
        stats.cacheSet += cacheSet ? 1 : 0;

        return tmdbData as Meta;
      })
    );

    metas = metaResults
    .filter((result): result is PromiseFulfilledResult<Meta> => result.status === "fulfilled" && result.value !== null)
    .map(result => result.value);

    if (useCache && redis && semanticCache && metas.length > 0) {
      
      const trendingKey = lang && lang !== 'en'
  ? (type === "movie" ? `trendingmovies:${lang}` : `trendingseries:${lang}`)
  : (type === "movie" ? "trendingmovies" : "trendingseries");

      const topMetaJson = JSON.stringify(metas[0]);
      const semanticJson = JSON.stringify(metas);

      await Promise.all([
        redis.lpush(trendingKey, topMetaJson),
        redis.ltrim(trendingKey, 0, SEARCH_COUNT - 1),
        semanticCache.set(cacheKey, semanticJson),
      ]);

      log(`${stats.fromCache} ${type}(s) returned from cache.`);
      log(`${stats.fromTmdb} ${type}(s) fetched from TMDB.`);
      log(`${stats.cacheSet} ${type}(s) added to cache.`);
    }

    if (rpdbKey) await updateRpdbPosters(metas, rpdbKey);

    if(backgroundUpdateBatch.length > 0){
      await pushBatchToQstash(backgroundUpdateBatch);
    }

    // playing with browser caching within stremio.. not sure if this will work, but if it does, we shall see..
    ctx.response.headers.set("Cache-Control", "public, max-age=2592000");
    const expireDate = new Date(Date.now() + 2592000 * 1000); 
    ctx.response.headers.set("Expires", expireDate.toUTCString());

    ctx.response.body = { metas };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logError(
      `Error processing ${type} catalog request for "${searchQuery}": ${errorMessage}`,
      error
    );
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Failed to generate recommendations",
      details: errorMessage,
    };
  }
};