import { redis } from "../config/redisCache.ts";
import type { Meta } from "../config/types/meta.ts";
import { logError } from "./utils.ts";
import { formatMetas } from "./utils.ts";

import { updateRpdbPosters } from "../services/rpdb.ts";

const TRENDING_SERIES_LIST = "trendingseries";
const TRENDING_MOVIES_LIST = "trendingmovies";

interface TrendingResponse {
  metas: Meta[];
}

const getTrendingList = async (
  listKey: string,
  context: string,
): Promise<Meta[]> => {
  try {
    const rawList = await redis?.lrange(listKey, 0, -1);
    if (!rawList) return [];
    return rawList
      .filter((meta: Meta): meta is Meta => meta !== null);
  } catch (error) {
    logError(`Error fetching ${context} from Redis:`, error);
    return [];
  }
};

export const getTrendingSeries = async (
  rpdbKey?: string | null,
  lang?: string | null,
): Promise<TrendingResponse> => {
  const trendingKey = lang ? `${TRENDING_SERIES_LIST}:${lang}` : TRENDING_SERIES_LIST;
  let metas = await getTrendingList(trendingKey, "trending series");
  if (rpdbKey) {
    await updateRpdbPosters(metas, rpdbKey);
  }

  metas = formatMetas(metas);
  return { metas };
};

export const getTrendingMovies = async (
  rpdbKey?: string | null,
  lang?: string | null,
): Promise<TrendingResponse> => {
  const trendingKey = lang ? `${TRENDING_MOVIES_LIST}:${lang}` : TRENDING_MOVIES_LIST;
  let metas = await getTrendingList(trendingKey, "trending movies");
  if (rpdbKey) {
    await updateRpdbPosters(metas, rpdbKey);
  }
  metas = formatMetas(metas);
  return { metas };
};