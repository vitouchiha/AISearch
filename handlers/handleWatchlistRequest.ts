import type { Context } from "../config/deps.ts";
import type { Meta } from "../config/types/meta.ts";
import type { BackgroundTaskParams } from "../config/types/types.ts";
import { redis } from "../config/redisCache.ts";
import { formatMetas, log, logError } from "../utils/utils.ts";
import { getTraktMovieRecommendations } from "../services/ai.ts";
import { fetchTmdbData } from "../services/tmdbHelpers/tmdbCommon.ts";
import { getTraktRecentWatches } from "../services/trakt.ts";
import { SEARCH_COUNT } from "../config/env.ts";
import { updateRpdbPosters } from "../services/rpdb.ts";
import { getProviderInfoFromState } from "../services/aiProvider.ts";
import { ListTaskParams, pushBatchToQstash, pushListToQstash } from "../config/qstash.ts";
import { createRedisKey } from "../services/tmdbHelpers/tmdbCommon.ts";
import { isOldCacheStructure, convertOldToNewStructure } from "../services/tmdbHelpers/fixOldCache.ts";

export const handleTraktWatchlistRequest = async (ctx: Context) => {
  const { tmdbKey, traktKey, rpdbKey, omdbKey, userId, type, traktCreateList } = ctx.state;
  
  // Validate required parameters
  if (!traktKey || !type || !userId || !tmdbKey) {
    ctx.response.body = { metas: [] };
    return;
  }

  const cacheKey = `user:${userId}:recent-${type}`;
  let metas: Meta[] = [];
  const backgroundUpdateBatch: BackgroundTaskParams[] = [];

  try {
    // Check if semantic cache already exists
    const cachedResult = await redis?.get(cacheKey);
    if (cachedResult) {
      let parsedCache: any;
      try {
        parsedCache = cachedResult;
      } catch (error) {
        logError(`Error parsing cache for key ${cacheKey}:`, error);
      }
      if (parsedCache) {
        // Check for old cache structure
        if (isOldCacheStructure(parsedCache)) {
          backgroundUpdateBatch.push({
            type,
            movieName: parsedCache.name,
            lang: parsedCache.lang,
            tmdbKey,
            omdbKey,
            redisKey: cacheKey,
          });
          metas = convertOldToNewStructure(parsedCache, type);
        } else {
          metas = parsedCache;
        }
        if (rpdbKey) await updateRpdbPosters(metas, rpdbKey);
        metas = formatMetas(metas);
        ctx.response.body = { metas };
        return;
      }
    }

    // Get recent watch history and extract titles
    const recentWatches = await getTraktRecentWatches(type, traktKey, SEARCH_COUNT);
    const titles = recentWatches
      .map((event: any) => type === "movie" ? event.movie?.title : event.show?.title)
      .filter(Boolean);
    const titleString = titles.join(", ");

    // Retrieve movie recommendations based on recent watch titles
    const { provider, apiKey, model } = getProviderInfoFromState(ctx.state);
    const { recommendations: movieNames, lang } = await getTraktMovieRecommendations(titleString, type, { provider, apiKey, model });
    if (!movieNames?.length) {
      ctx.response.body = { metas: [] };
      return;
    }

    // Prepare redis keys for individual movie data
    const redisKeys = movieNames.map(movieName => createRedisKey(movieName, lang, type));
    const cachedResults = await redis?.mget(redisKeys) || [];
    const keysToSet: Record<string, string> = {};

    const stats = { fromCache: 0, fromTmdb: 0, cacheSet: 0 };

    // For each movie, try retrieving TMDB data from cache first
    const metaResults = await Promise.all(
      movieNames.map(async (movieName, index) => {
        const redisKey = redisKeys[index];
        let tmdbData: Meta | null = null;
        const cached = cachedResults[index];
        if (cached) {
          try {
            const parsed = cached;
            if (isOldCacheStructure(parsed)) {
              backgroundUpdateBatch.push({ movieName, lang, type, tmdbKey, omdbKey, redisKey });
              tmdbData = convertOldToNewStructure(parsed, type);
            } else {
              tmdbData = parsed as Meta;
            }
            stats.fromCache++;
          } catch (err) {
            logError(`Error parsing cache for key ${redisKey}:`, err);
          }
        }
        if (!tmdbData) {
          tmdbData = await fetchTmdbData(movieName, lang, type, tmdbKey, omdbKey);
          stats.fromTmdb++;
          keysToSet[redisKey] = JSON.stringify(tmdbData);
        }
        return tmdbData;
      })
    );

    // Set any new TMDB data into cache
    if (Object.keys(keysToSet).length > 0) {
      await redis?.mset(keysToSet);
      stats.cacheSet = Object.keys(keysToSet).length;
    }

    // Filter out any invalid data and cache aggregated result
    metas = metaResults.filter(meta => meta && meta.id && meta.name);
    if (metas.length > 0) {
      const tasks: ListTaskParams[] = [
        {
          listName: 'watched',
          metas,
          type,
          traktKey,
        },
      ];

      await Promise.all([
        redis?.set(cacheKey, JSON.stringify(metas), { ex: 3600 }),
        traktCreateList ? pushListToQstash(tasks) : Promise.resolve(null)
      ]);
    }
    if (rpdbKey) await updateRpdbPosters(metas, rpdbKey);
    if (backgroundUpdateBatch.length > 0) await pushBatchToQstash(backgroundUpdateBatch);

    metas = formatMetas(metas);
    ctx.response.body = { metas };

    // Optionally, log stats for monitoring
    log(`${stats.fromCache} ${type}(s) returned from cache.`);
    log(`${stats.fromTmdb} ${type}(s) fetched from TMDB.`);
    log(`${stats.cacheSet} ${type}(s) added to cache.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logError(`Error processing ${type} watchlist request for user ${userId}: ${errorMessage}`, error);
    ctx.response.body = { metas: [] };
  }
};
