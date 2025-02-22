import { Context } from "../config/deps.ts";
import type { Meta } from "../config/types/types.ts";
import { redis } from "../config/redisCache.ts";
import { log } from "../utils/utils.ts";
import { buildMeta } from "../utils/buildMeta.ts";
import { getTraktMovieRecommendations } from "../services/ai.ts";
import { getTmdbDetailsByName } from "../services/tmdb.ts";
import { getTraktRecentWatches } from "../services/trakt.ts";
import { SEARCH_COUNT } from "../config/env.ts";
import { updateRpdbPosters } from "../services/rpdb.ts";

const isMeta = (meta: any): meta is Meta =>
  meta !== null &&
  typeof meta === "object" &&
  typeof meta.id === "string" &&
  meta.id.trim().length > 0 &&
  typeof meta.poster === "string" &&
  meta.poster.trim().length > 0 &&
  typeof meta.name === "string" &&
  meta.name.trim().length > 0 &&
  typeof meta.type === "string" &&
  meta.type.trim().length > 0;

const isFulfilled = <T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> => result.status === "fulfilled";

export const handleTraktWatchlistRequest = async (ctx: Context) => {
  const { tmdbKey, googleKey, traktKey, rpdbKey, userId, type } = ctx.state;

  if (!traktKey || !type || !googleKey || !userId || !tmdbKey) {
    ctx.response.body = { metas: [] };
    return;
  }

  const cacheKey = `user:${userId}:recent-${type}`;
  const cache = await redis?.get(cacheKey) as Meta[];
  if (cache) {
    if (rpdbKey) {
      await updateRpdbPosters(cache, rpdbKey);
    }
    ctx.response.body = { metas: cache };
    return;
  }


  const recentWatches = await getTraktRecentWatches(type, traktKey, SEARCH_COUNT);
  const titles = recentWatches
    .map((event: any) => {
      if (type === "movie") {
        return event.movie?.title;
      } else {
        return event.show?.title;
      }
    })
    .filter(Boolean);

  const titleString = titles.join(", ");

  // run it through ai
  const movieNames = await getTraktMovieRecommendations(titleString, type, googleKey)
  const stats = { fromCache: 0, fromTmdb: 0, cacheSet: 0 };

  const metaResults = await Promise.allSettled(
    movieNames.map(async (movieName, index) => {
      log(`Fetching recommendation ${index + 1} for ${type}: ${movieName}`);

      const { data: tmdbData, fromCache, cacheSet } =
        await getTmdbDetailsByName(movieName, type, tmdbKey);

      stats.fromCache += fromCache ? 1 : 0;
      stats.fromTmdb += fromCache ? 0 : 1;
      stats.cacheSet += cacheSet ? 1 : 0;

      const meta = buildMeta(tmdbData, type);

      return isMeta(meta) ? meta : null;
    })
  );

  const metas: Meta[] = metaResults
    .filter(isFulfilled)
    .map((result) => result.value)
    .filter(isMeta);

  await redis?.set(cacheKey, JSON.stringify(metas), { ex: 3600 });
  if (rpdbKey) {
    await updateRpdbPosters(metas, rpdbKey);
  }
  ctx.response.body = { metas };

}