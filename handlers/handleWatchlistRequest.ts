import type { Context } from "../config/deps.ts";
import type { Meta } from "../config/types/meta.ts";
import type { BackgroundTaskParams } from "../config/types/types.ts";
import { redis } from "../config/redisCache.ts";
import { formatMetas, log } from "../utils/utils.ts";
import { getTraktMovieRecommendations } from "../services/ai.ts";
import { getTmdbDetailsByName } from "../services/tmdb.ts";
import { getTraktRecentWatches } from "../services/trakt.ts";
import { SEARCH_COUNT } from "../config/env.ts";
import { updateRpdbPosters } from "../services/rpdb.ts";
import { getProviderInfoFromState } from "../services/aiProvider.ts";
import { pushBatchToQstash } from "../config/qstash.ts";

export const handleTraktWatchlistRequest = async (ctx: Context) => {
  const { tmdbKey, googleKey, openAiKey, traktKey, rpdbKey, omdbKey, userId, type } = ctx.state;
  // TODO: Add users language to the state!!
  //const lang = 'en'; // everyone is english for now.
  // We might not need to depending on how trakt sends it's data..

  if (!traktKey || !type || !userId || !tmdbKey || (!googleKey && !openAiKey)) {
    ctx.response.body = { metas: [] };
    return;
  }

  const cacheKey = `user:${userId}:recent-${type}`;
  const backgroundUpdateBatch: BackgroundTaskParams[] = [];
  const cache = await redis?.get(cacheKey) as Meta[];
  if (cache) {
    if (cache.showName) { await redis?.del(cacheKey) }
    if (rpdbKey) {
      await updateRpdbPosters(cache, rpdbKey);
    }
    //ctx.response.headers.set("Cache-Control", "public, max-age=3600");
    const metas = formatMetas(cache);
    ctx.response.body = { metas };
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

  const { provider, apiKey } = getProviderInfoFromState(ctx.state);

  const { recommendations: movieNames, lang } = await getTraktMovieRecommendations(titleString, type, { provider, apiKey });
  const stats = { fromCache: 0, fromTmdb: 0, cacheSet: 0 };

  const metaResults = await Promise.allSettled(
    movieNames.map(async (movieName, index) => {
      log(`Fetching recommendation ${index + 1} for ${type}: ${movieName}`);

      const { data: tmdbData, fromCache, cacheSet } =
        await getTmdbDetailsByName(movieName, lang, type, tmdbKey, omdbKey, backgroundUpdateBatch);

      stats.fromCache += fromCache ? 1 : 0;
      stats.fromTmdb += fromCache ? 0 : 1;
      stats.cacheSet += cacheSet ? 1 : 0;

      return tmdbData;
    })
  );

  let metas = metaResults
    .filter((result): result is PromiseFulfilledResult<Meta> => result.status === "fulfilled" && result.value !== null)
    .map(result => result.value)
    .filter(meta => meta.id && meta.name);

  if (metas.length > 0) await redis?.set(cacheKey, JSON.stringify(metas), { ex: 3600 });
  if (rpdbKey) await updateRpdbPosters(metas, rpdbKey);
  if (backgroundUpdateBatch.length > 0) await pushBatchToQstash(backgroundUpdateBatch);

  metas = formatMetas(metas);

  //ctx.response.headers.set("Cache-Control", "public, max-age=3600");
  ctx.response.body = { metas };

}