import { TMDBDetails } from "../config/types.ts";
import { TMDB_API_KEY, DEV_MODE } from "../config/env.ts";
import { redis } from "../config/redisCache.ts";

interface TmdbFetchResult {
  data: TMDBDetails;
  fromCache: boolean;
  cacheSet: boolean;
}

export async function getTmdbDetailsByName(movieName: string): Promise<TmdbFetchResult> {
  const normalizedName = movieName.toLowerCase().trim();
  const redisKey = `movie:name:${normalizedName}`;

  try {
    const cached = await redis.get<TMDBDetails>(redisKey);
    if (cached) {
      DEV_MODE && console.log(`[${new Date().toISOString()}] Returning cached details for movie: ${movieName}`);
      return {
        data: cached,
        fromCache: true,
        cacheSet: false,
      };
    }
  } catch (cacheError: unknown) {
    cacheError instanceof Error && console.error(`[${new Date().toISOString()}] Redis cache error for movie: ${movieName}`, cacheError.message);
  }

  DEV_MODE && console.log(`[${new Date().toISOString()}] Fetching TMDB details for movie: ${movieName}`);
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieName)}`;
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) throw new Error(`TMDB search API responded with status ${searchResponse.status}`);

    const searchData = await searchResponse.json();
    const firstResult = searchData.results?.[0];
    if (!firstResult) throw new Error(`No results found for movie name: ${movieName}`);

    const tmdbId = firstResult.id;
    const detailsUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const detailsResponse = await fetch(detailsUrl);
    if (!detailsResponse.ok) throw new Error(`TMDB details API responded with status ${detailsResponse.status}`);

    const detailsData = await detailsResponse.json();
    const imdbId = detailsData.external_ids?.imdb_id;

    let result: TMDBDetails;
    if (!imdbId) result = { id: "", poster: null, showName: null, year: null };
    else result = {
      id: imdbId,
      poster: detailsData.poster_path
        ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
        : null,
      showName: detailsData.title,
      year: detailsData.release_date
        ? detailsData.release_date.split("-")[0]
        : null,
    };

    let cacheSet = false;
    if (result.poster) {
      try {
        await redis.set(redisKey, JSON.stringify(result));
        await redis.set(`movie:${imdbId}`, JSON.stringify(result));
        DEV_MODE && console.log(`[${new Date().toISOString()}] Cached details for movie: ${movieName}`);
        cacheSet = true;
      } catch (cacheSetError) {
        cacheSetError instanceof Error && console.error(`[${new Date().toISOString()}] Error setting cache for movie: ${movieName}`, cacheSetError.message);
      }
    }

    return {
      data: result,
      fromCache: false,
      cacheSet,
    };
  } catch (error: unknown) {
    DEV_MODE && error instanceof Error && console.error(`[${new Date().toISOString()}] Error fetching TMDB details for movie: ${movieName}`, error.message);
    return {
      data: { id: "", poster: null, showName: null, year: null },
      fromCache: false,
      cacheSet: false,
    };
  }
}