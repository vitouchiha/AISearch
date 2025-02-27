import { TMDB_API_KEY, NO_CACHE } from "../config/env.ts";
import { redis } from "../config/redisCache.ts";
import { convertOldToNewStructure, isOldCacheStructure } from "./tmdbHelpers/fixOldCache.ts";

import type { BackgroundTaskParams } from "../config/types/types.ts";
import type { Meta } from "../config/types/meta.ts";
import { fetchTmdbData, createRedisKey, tryGetFromCache, shouldCache, cacheResult } from "./tmdbHelpers/tmdbCommon.ts";

const useCache = NO_CACHE !== "true";

export async function getTmdbDetailsByName(
  movieName: string,
  lang: string,
  type: "movie" | "series",
  tmdbKey: string,
  omdbKey: string,
  backgroundBatch?: BackgroundTaskParams[]
): Promise<{ data: Meta; fromCache: boolean; cacheSet: boolean }> {
  const redisKey = createRedisKey(movieName, lang, type);

  if (useCache && redis) {
    const cached = await tryGetFromCache(redisKey, type, movieName);
    if (cached) {
      if (isOldCacheStructure(cached)) {
        backgroundBatch?.push({ movieName, lang, type, tmdbKey, omdbKey, redisKey });
        return { data: convertOldToNewStructure(cached, type), fromCache: true, cacheSet: false };
      }
      return { data: cached, fromCache: true, cacheSet: false };
    }
  }
  const result = await fetchTmdbData(movieName, lang, type, tmdbKey, omdbKey);
  
  let cacheSet = false;
  if (useCache && shouldCache(result) && redis) {
    cacheSet = await cacheResult(redisKey, type, lang, result);
  }
  
  return { data: result, fromCache: false, cacheSet };
}



export async function tmdbHealthCheck(tmdbKey = TMDB_API_KEY){
  try {
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbKey}`, { method: "HEAD" });
    return tmdbResponse.ok; 
  } catch (error) {
    console.error("TMDB health check failed:", error);
    return false;
  }
}