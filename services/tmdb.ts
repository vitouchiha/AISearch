import { TMDBDetails } from "../config/types/types.ts";
import { TMDB_API_KEY } from "../config/env.ts";
import { redis } from "../config/redisCache.ts";
import { fetchCinemeta } from "./cinemeta.ts";
import { log, logError, fetchJson } from "../utils/utils.ts";

interface TmdbFetchResult {
  data: TMDBDetails;
  fromCache: boolean;
  cacheSet: boolean;
}

export async function getTmdbDetailsByName(movieName: string, type: string): Promise<TmdbFetchResult> {
  const normalizedName = movieName.toLowerCase().trim();
  const redisKey = `${type}:name:${normalizedName}`;

  try {
    const cached = await redis.get<TMDBDetails>(redisKey);
    if (cached) {
      log(`Returning cached details for movie: ${movieName}`);
      return { data: cached, fromCache: true, cacheSet: false };
    }
  } catch (err) {
    logError(`Redis cache error for movie: ${movieName}`, err);
  }

  log(`Fetching TMDB details for movie: ${movieName}`);
  try {
    const tmdbType = type === "series" ? "tv" : type;
    const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      movieName
    )}`;
    const searchData = await fetchJson(searchUrl, "TMDB search");
    const firstResult = searchData.results?.[0];
    if (!firstResult) throw new Error(`No results found for movie: ${movieName}`);

    const detailsUrl = `https://api.themoviedb.org/3/${tmdbType}/${firstResult.id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const detailsData = await fetchJson(detailsUrl, "TMDB details");
    const imdbId = detailsData.external_ids?.imdb_id;

    let result: TMDBDetails = { id: "", poster: null, showName: null, year: null };
    let posterUrl = null;
    if (imdbId) {
      let titleField = type === "series" ? detailsData.name : detailsData.title;
      let dateField = type === "series" ? detailsData.first_air_date : detailsData.release_date;
          posterUrl = detailsData.poster_path
        ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
        : null;

      // Fallback to cinemeta if any critical field is missing
      if (!posterUrl || !titleField || !dateField) {
        const cinemeta = await fetchCinemeta(type, imdbId);
        posterUrl = cinemeta?.poster || null;
        titleField = cinemeta?.showName || null;
        dateField = cinemeta?.year || null;
      }

      result = {
        id: imdbId,
        poster: posterUrl,
        showName: titleField,
        year: dateField ? dateField.split("-")[0] : null,
      };
    }

    let cacheSet = false;
    if (posterUrl) {
      try {
        await redis.set(redisKey, JSON.stringify(result));
        await redis.set(`${type}:${imdbId}`, JSON.stringify(result));
        log(`Cached details for movie: ${movieName}`);
        cacheSet = true;
      } catch (err) {
        logError(`Error setting cache for movie: ${movieName}`, err);
      }
    }

    return { data: result, fromCache: false, cacheSet };
  } catch (err) {
    logError(`Error fetching TMDB details for movie: ${movieName}`, err);
    return {
      data: { id: "", poster: null, showName: null, year: null },
      fromCache: false,
      cacheSet: false,
    };
  }
}