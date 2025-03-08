// tmdbBackground.ts
import { fetchTmdbData, shouldCache } from "../tmdbHelpers/tmdbCommon.ts"
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
): Promise<Record<string, string> | null> {
  try {
    const updated: Meta = await fetchTmdbData(movieName, lang, type, tmdbKey, omdbKey);
    if (shouldCache(updated) && redis) {
      const jsonResult = JSON.stringify(updated);
      // Use different key schemas if needed.
      const secondKey =
        updated.id && lang === "en"
          ? `${type}:${updated.id}`
          : `${type}:${lang}:${updated.id}`;
      log(`Background updated cache for ${type}: ${movieName}`);
      return {
        [redisKey]: jsonResult,
        [secondKey]: jsonResult,
      };
    }
  } catch (err) {
    logError(`Background fetch error for ${type}: ${movieName}`, err);
  }
  return null;
}
