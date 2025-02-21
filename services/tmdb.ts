import { TMDBDetails } from "../config/types/types.ts";
import { TMDB_API_KEY, NO_CACHE } from "../config/env.ts";
import { redis } from "../config/redisCache.ts";
import { fetchCinemeta } from "./cinemeta.ts";
import { fetchJson, log, logError, validatePosterUrl } from "../utils/utils.ts";

interface TmdbFetchResult {
  data: TMDBDetails;
  fromCache: boolean;
  cacheSet: boolean;
}

const useCache = NO_CACHE !== "true";

export async function getTmdbDetailsByName(
  movieName: string,
  type: string,
): Promise<TmdbFetchResult> {

  if (type !== "movie" && type !== "series") {
    throw new Error(`Invalid type: ${type}. Expected "movie" or "series".`);
  }

  const normalizedName = movieName.toLowerCase().trim();
  const redisKey = `${type}:name:${normalizedName}`;

  // Check cache first
  if (useCache && redis) {
    try {
      const cached = await redis.get(redisKey) as TMDBDetails;
      if (cached) {
        log(`Returning cached details for ${type}: ${movieName}`);
        return { data: cached, fromCache: true, cacheSet: false };
      }
    } catch (err) {
      logError(`Redis cache error for ${type}: ${movieName}`, err);
    }
  }

  log(`Fetching TMDB details for ${type}: ${movieName}`);
  try {
    const tmdbType = type === "series" ? "tv" : "movie";
    const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      movieName
    )}`;
    const searchData = await fetchJson(searchUrl, "TMDB search");
    const firstResult = searchData.results?.[0];

    if (!firstResult) {
      logError(`No results found for ${type}: ${movieName}`, searchData);
      return {
        data: { id: "", poster: null, showName: null, year: null },
        fromCache: false,
        cacheSet: false,
      };
    }

    const detailsUrl = `https://api.themoviedb.org/3/${tmdbType}/${
      firstResult.id
    }?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const detailsData = await fetchJson(detailsUrl, "TMDB details");
    const imdbId = detailsData.external_ids?.imdb_id;

    let result: TMDBDetails = {
      id: "",
      poster: null,
      showName: null,
      year: null,
    };

    if (imdbId) {
      const titleField = type === "series" ? detailsData.name : detailsData.title;
      const dateField =
        type === "series" ? detailsData.first_air_date : detailsData.release_date;
      let posterUrl = detailsData.poster_path
        ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
        : null;

        if (posterUrl) {
          const isValidPoster = await validatePosterUrl(posterUrl);
          if (!isValidPoster) {
            posterUrl = null;
          }
        }

      // Fallback to Cinemeta if critical fields are missing
      if (!posterUrl || !titleField || !dateField) {
        const cinemeta = await fetchCinemeta(type, imdbId);
        posterUrl = cinemeta?.poster || posterUrl;
        const fallbackTitle = cinemeta?.showName || titleField;
        const fallbackDate = cinemeta?.year || dateField;
        result = {
          id: imdbId,
          poster: posterUrl,
          showName: fallbackTitle,
          year: fallbackDate ? String(fallbackDate).split("-")[0] : null,
        };
      } else {
        result = {
          id: imdbId,
          poster: posterUrl,
          showName: titleField,
          year: dateField ? dateField.split("-")[0] : null,
        };
      }
    }

    // Cache the result if applicable
    let cacheSet = false;
    if (useCache && result.poster && redis) {
      try {
        const jsonResult = JSON.stringify(result);
        await Promise.all([
          redis.set(redisKey, jsonResult),
          redis.set(`${type}:${imdbId}`, jsonResult),
        ]);
        log(`Cached details for ${type}: ${movieName}`);
        cacheSet = true;
      } catch (err) {
        logError(`Error setting cache for ${type}: ${movieName}`, err);
        return {
          data: { id: "", poster: null, showName: null, year: null },
          fromCache: false,
          cacheSet: false,
        };
      }
    }

    return { data: result, fromCache: false, cacheSet };
  } catch (err) {
    logError(`Error fetching TMDB details for ${type}: ${movieName}`, err);
    return {
      data: { id: "", poster: null, showName: null, year: null },
      fromCache: false,
      cacheSet: false,
    };
  }
}

export async function tmdbHealthCheck(){
  try {
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${TMDB_API_KEY}`, { method: "HEAD" });
    return tmdbResponse.ok; 
  } catch (error) {
    console.error("TMDB health check failed:", error);
    return false;
  }
}