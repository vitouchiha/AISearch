import { redis } from "../config/redisCache.ts";
import { Meta } from "../config/types.ts";

const TRENDING_MOVIES_LIST = "trendingmovies";

interface TrendingMoviesResponse {
  metas: Meta[];
}

export const getTrendingMovies = async (): Promise<TrendingMoviesResponse> => {
  try {
    const trendingMoviesJson = await redis.lrange(TRENDING_MOVIES_LIST, 0, -1);

    if (!trendingMoviesJson) return { metas: [] };

    const trendingMovies: Meta[] = trendingMoviesJson.map((movieJson) => {
      try {
        const parsedMovie = movieJson;
        return parsedMovie as Meta;
      } catch (error) {
        console.error("Error parsing trending movie JSON:", movieJson, error);
        return null;
      }
    }).filter((movie): movie is Meta => movie !== null);

    return { metas: trendingMovies };
  } catch (error) {
    console.error("Error fetching trending movies from Redis:", error);
    return { metas: [] };
  }
};