import { semanticCache } from "../config/semanticCache.ts";
import { redis } from "../config/redisCache.ts";
import { type Context } from "../config/deps.ts";
import { GEMINI_API_KEY, ROOT_URL, SEARCH_COUNT } from "../config/env.ts";
import { log, logError, formatMetas } from "../utils/utils.ts";
import { getMovieRecommendations, translateMetaLanguage } from "../services/ai.ts";
import type { Meta } from "../config/types/meta.ts";
import { updateRpdbPosters } from "../services/rpdb.ts";
import { getProviderInfoFromState } from "../services/aiProvider.ts";
import { pushBatchToQstash } from "../config/qstash.ts";
import type { BackgroundTaskParams } from "../config/types/types.ts";
import { createRedisKey, fetchTmdbData } from "../services/tmdbHelpers/tmdbCommon.ts";
import { isOldCacheStructure, convertOldToNewStructure } from "../services/tmdbHelpers/fixOldCache.ts";
import { getRecentWatchedIds } from "../services/trakt.ts";


export const handleCatalogRequest = async (ctx: Context): Promise<void> => {
  const { searchQuery, type, tmdbKey, tmdbLanguage, rpdbKey, omdbKey, googleKey, traktKey, featherless, userId } = ctx.state;

  if (!searchQuery || !type) {
    //ctx.response.body = { metas: [] };
    return;
  }

  const cacheKey = `${type}:${tmdbLanguage !== 'en' ? tmdbLanguage +':' : ''}${searchQuery}`;
  let metas: Meta[] = [];
  const backgroundUpdateBatch: BackgroundTaskParams[] = [];

  try {
    // if they are using the default key, use the semantic cache.
    if (semanticCache) {
      try {
        const cachedResult = await semanticCache.get(cacheKey);
        if (cachedResult) {
          metas = JSON.parse(cachedResult);
          log(`Cache hit for query: (${type}) ${searchQuery}`);
          if (rpdbKey) await updateRpdbPosters(metas, rpdbKey);
          metas = formatMetas(metas) as Meta[];
          ctx.response.headers.set("Content-Type", "application/json");
          ctx.response.body = { metas };
          return;
        }
      } catch (error) {
        logError(`Cache read error for ${cacheKey}:`, error);
      }
    }

    let watchedListIds: string | undefined;
    if(traktKey && googleKey !== GEMINI_API_KEY && userId){
      watchedListIds = await getRecentWatchedIds(userId, traktKey, type);
    }

    // Get recommendations and language info
    const { provider, apiKey, model } = getProviderInfoFromState(ctx.state);
    const { recommendations: movieNames, lang, error } = await getMovieRecommendations(
      searchQuery,
      '',
      type,
      { provider, apiKey, model }
    );

    if (error) {
      ctx.response.headers.set("Content-Type", "application/json");
      const rawMeta: Meta[] = [
          {
            id: 'tt0000000',
            type,
            name: `Error! ${error}`,
            poster: ROOT_URL + '/images/bad_apikey.webp',
            posterShape: "poster",
          }
        ];
        
        if(String(error).includes("Invalid JSON response")){
          //ctx.response.body = { metas: [] };
          return;
        }

      const metas = formatMetas(rawMeta);
      ctx.response.body = { metas };
      return;
    }

    if (!movieNames?.length) {
      //ctx.response.body = { metas: [] };
      return;
    }

    const language = tmdbLanguage ? tmdbLanguage : lang;
    // if you use language the tmdbLanguage will always over ride... I'm not sure I want to do this...

    // Initialize stats
    const stats = { fromCache: 0, fromTmdb: 0, cacheSet: 0 };

    const redisKeys = movieNames.map(movieName => createRedisKey(movieName, language, type));
    const cachedResults = await redis?.mget(redisKeys) || [];
    const keysToSet: Record<string, string> = {};

    const metaResults = await Promise.all(
      movieNames.map(async (movieName, index) => {
        log(`Fetching recommendation ${index + 1} for ${type}: ${movieName}`);
        const redisKey = redisKeys[index];
        let tmdbData: Meta | null = null;
        let usedCache = false;
        let fetchedFromTmdb = false;
    
        const cached = cachedResults[index] as Meta;
        if (cached) {
          try {
            const parsed = cached;
            if (isOldCacheStructure(parsed)) {
              backgroundUpdateBatch.push({ movieName, lang: language, type, tmdbKey, omdbKey, redisKey });
              tmdbData = convertOldToNewStructure(parsed, type);
            } else {
              tmdbData = parsed;
            }
            usedCache = true;
          } catch (err) {
            logError(`Error parsing cache for key ${redisKey}:`, err);
          }
        }

        if (!tmdbData) {
          const result = await fetchTmdbData(movieName, language, type, tmdbKey, omdbKey);
          tmdbData = result;
          fetchedFromTmdb = true;
          keysToSet[redisKey] = JSON.stringify(tmdbData);
        }
    
        stats.fromCache += usedCache ? 1 : 0;
        stats.fromTmdb += fetchedFromTmdb ? 1 : 0;

        return tmdbData;
      })
    );

    const numKeysToSet = Object.keys(keysToSet).length;
    if (numKeysToSet > 0 && redis) {
      await redis.mset(keysToSet);
      stats.cacheSet = numKeysToSet;
    }

    metas = metaResults.filter(meta => meta && meta.id && meta.name);

    if (redis && metas.length > 0) {
      const trendingKey =
        lang && lang !== "en"
          ? type === "movie"
            ? `trendingmovies:${lang}`
            : `trendingseries:${lang}`
          : type === "movie"
          ? "trendingmovies"
          : "trendingseries";

      const topMetaJson = JSON.stringify(metas[0]);
      const semanticJson = JSON.stringify(metas);
 
      // Some featherless model's give low value results so don't cache them.
      Promise.all([
        redis.lpush(trendingKey, topMetaJson),
        redis.ltrim(trendingKey, 0, SEARCH_COUNT - 1),
        semanticCache && googleKey !== GEMINI_API_KEY && !featherless ? semanticCache.set(cacheKey, semanticJson) : null,
      ]);

      log(`${stats.fromCache} ${type}(s) returned from cache.`);
      log(`${stats.fromTmdb} ${type}(s) fetched from TMDB.`);
      log(`${stats.cacheSet} ${type}(s) added to cache.`);
    }

    if (rpdbKey) await updateRpdbPosters(metas, rpdbKey);

    if (backgroundUpdateBatch.length > 0) {
      await pushBatchToQstash(backgroundUpdateBatch);
    }

    // Get translations using AI. This adds an additional 20 seconds to the request. Also uses a ton of tokens.
    // I do not recommend this.
    ///
    // if (lang && lang !== "en" && (googleKey !== GEMINI_API_KEY)) {
    //   const reducedMetas = metas.map(({ id, name, description }) => ({ id, name, description }));
    //   const translatedReducedMetas = await translateMetaLanguage(reducedMetas, lang, { provider, apiKey, model });
    //   metas = metas.map(meta => {
    //     const translated = translatedReducedMetas.find(t => t.id === meta.id);
    //     return translated ? { ...meta, name: translated.name, description: translated.description } : meta;
    //   });
    // }

    const watchedIds = new Set(watchedListIds ? watchedListIds.split(',').map(id => id.trim()) : []);
    metas = metas?.filter(meta => !watchedIds.has(meta.id));

    metas = formatMetas(metas);

    ctx.response.body = { query: searchQuery, metas };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logError(`Error processing ${type} catalog request for "${searchQuery}": ${errorMessage}`, error);
    //ctx.response.body = { metas: [] };
  }
};