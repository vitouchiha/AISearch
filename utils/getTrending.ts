import { redis } from "../config/redisCache.ts";
import { Meta } from "../config/types.ts";

const TRENDING_SERIES_LIST = "trendingseries";

interface TrendingSeriesResponse {
  metas: Meta[];
}

export const getTrendingSeries = async (): Promise<TrendingSeriesResponse> => {
  try {
    const trendingSeriesJson = await redis.lrange(TRENDING_SERIES_LIST, 0, -1);

    if (!trendingSeriesJson) return { metas: [] };

    const trendingSeries: Meta[] = trendingSeriesJson.map((seriesJson: Meta) => {
      try {
        return seriesJson as Meta;
      } catch (error) {
        console.error("Error parsing trending series JSON:", seriesJson, error);
        return null;
      }
    }).filter((series): series is Meta => series !== null);

    return { metas: trendingSeries };
  } catch (error) {
    console.error("Error fetching trending series from Redis:", error);
    return { metas: [] };
  }
};


const TRENDING_MOVIES_LIST = "trendingmovies";

interface TrendingMoviesResponse {
  metas: Meta[];
}

export const getTrendingMovies = async (): Promise<TrendingMoviesResponse> => {
  try {
    const trendingMoviesJson = await redis.lrange(TRENDING_MOVIES_LIST, 0, -1);

    if (!trendingMoviesJson) return { metas: [] };

    const trendingMovies: Meta[] = trendingMoviesJson.map((movieJson: Meta) => {
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