import { redis } from "../config/redisCache.ts";
import { Meta } from "../config/types/types.ts";

import { getRpdbPoster } from "../services/rpdb.ts";

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

const getTrendingList = async (listKey: string, context: string): Promise<Meta[]> => {
  try {
    const rawList = await redis.lrange(listKey, 0, -1);
    if (!rawList) return [];
    return rawList
      .map((item) => parseMeta(item, context))
      .filter((meta): meta is Meta => meta !== null);
  } catch (error) {
    console.error(`Error fetching ${context} from Redis:`, error);
    return [];
  }
};

export const getTrendingSeries = async (rpdbKey?: string): Promise<TrendingResponse> => {
  const metas = await getTrendingList(TRENDING_SERIES_LIST, "trending series");
  if(rpdbKey){
    console.log("Got rpdb key");
  for (const meta of metas) {
    const rpdb = await getRpdbPoster(meta.id, rpdbKey);
    if (rpdb.poster) meta.poster = rpdb.poster;
  }
}
  return { metas };
};

export const getTrendingMovies = async (rpdbKey?: string): Promise<TrendingResponse> => {
  const metas = await getTrendingList(TRENDING_MOVIES_LIST, "trending movies");
  if(rpdbKey){
    for (const meta of metas) {
      const rpdb = await getRpdbPoster(meta.id, rpdbKey);
      if (rpdb.poster) meta.poster = rpdb.poster;
    }
  }
  return { metas };
};
