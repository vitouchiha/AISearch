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

const parseMeta = (item: unknown, context: string): Meta | null => {
  try {
    return item as Meta;
  } catch (error) {
    console.error(`Error parsing ${context} item:`, item, error);
    return null;
  }
};

const getTrendingList = async (
  listKey: string,
  context: string,
): Promise<Meta[]> => {
  try {
    const rawList = await redis?.lrange(listKey, 0, -1);
    if (!rawList) return [];
    return rawList
      .map((item: Meta) => parseMeta(item, context))
      .filter((meta: Meta): meta is Meta => meta !== null);
  } catch (error) {
    logError(`Error fetching ${context} from Redis:`, error);
    return [];
  }
};

export const getTrendingSeries = async (
  rpdbKey?: string,
): Promise<TrendingResponse> => {
  let metas: Meta[] = await getTrendingList(TRENDING_SERIES_LIST, "trending series");
  if (rpdbKey) {
    await updateRpdbPosters(metas, rpdbKey);
  }

  metas = formatMetas(metas);
  return { metas };
};

export const getTrendingMovies = async (
  rpdbKey?: string,
): Promise<TrendingResponse> => {
  let metas = await getTrendingList(TRENDING_MOVIES_LIST, "trending movies");
  if (rpdbKey) {
    await updateRpdbPosters(metas, rpdbKey);
  }
  metas = formatMetas(metas);
  return { metas };
};