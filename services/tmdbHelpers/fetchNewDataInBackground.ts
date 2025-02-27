// tmdbBackground.ts
import { fetchTmdbData, cacheResult, shouldCache } from "../tmdbHelpers/tmdbCommon.ts"
import { redis } from "../../config/redisCache.ts";
import { log, logError } from "../../utils/utils.ts";
import type { Meta } from "../../config/types/meta.ts";

/**
 * Performs a background update of TMDB data and refreshes the cache.
 */
export async function fetchNewDataInBackground(
  type: "movie" | "series",
  movieName: string,
  lang: string,
  tmdbKey: string,
  omdbKey: string,
  redisKey: string,
): Promise<void> {
  try {
    const updated: Meta = await fetchTmdbData(movieName, lang, type, tmdbKey, omdbKey);
    if (shouldCache(updated) && redis) {
      await cacheResult(redisKey, type, lang, updated);
      log(`Background updated cache for ${type}: ${movieName}`);
    }
  } catch (err) {
    logError(`Background fetch error for ${type}: ${movieName}`, err);
  }
}
