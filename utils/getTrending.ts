import { redis } from "../config/redisCache.ts";
import type { MetaPreview } from "../config/types/meta.ts";
import { logError } from "./utils.ts";
import { formatPreviewMetas } from "./utils.ts";

import { updateRpdbPosters } from "../services/rpdb.ts";

const TRENDING_SERIES_LIST = "trendingseries";
const TRENDING_MOVIES_LIST = "trendingmovies";

interface TrendingResponse {
  metas: MetaPreview[];
}

const parseMeta = (item: unknown, context: string): MetaPreview | null => {
  try {
    return item as MetaPreview;
  } catch (error) {
    console.error(`Error parsing ${context} item:`, item, error);
    return null;
  }
};

const getTrendingList = async (
  listKey: string,
  context: string,
): Promise<MetaPreview[]> => {
  try {
    const rawList = await redis?.lrange(listKey, 0, -1);
    if (!rawList) return [];
    return rawList
      .map((item: MetaPreview) => parseMeta(item, context))
      .filter((meta: MetaPreview): meta is MetaPreview => meta !== null);
  } catch (error) {
    logError(`Error fetching ${context} from Redis:`, error);
    return [];
  }
};

export const getTrendingSeries = async (
  rpdbKey?: string,
): Promise<TrendingResponse> => {
  let metas = await getTrendingList(TRENDING_SERIES_LIST, "trending series");
  if (rpdbKey) {
    await updateRpdbPosters(metas, rpdbKey);
  }
  metas = formatPreviewMetas(metas);
  return { metas };
};

export const getTrendingMovies = async (
  rpdbKey?: string,
): Promise<TrendingResponse> => {
  let metas = await getTrendingList(TRENDING_MOVIES_LIST, "trending movies");
  if (rpdbKey) {
    await updateRpdbPosters(metas, rpdbKey);
  }
  metas = formatPreviewMetas(metas);
  return { metas };
};