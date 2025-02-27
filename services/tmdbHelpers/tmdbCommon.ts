// tmdbCommon.ts
import { fetchJson, formatRuntime, log, logError } from "../../utils/utils.ts";
import { redis } from "../../config/redisCache.ts";
import { fetchCinemeta } from "../cinemeta.ts";
import { getOMDBMovieDetails } from "../omdb.ts";

import type { Meta } from "../../config/types/meta.ts";
import type { TMDBMovieDetails } from "../../config/types/TMDBMovieDetails.ts";
import type { TMDBSeriesDetails } from "../../config/types/TMDBSeriesDetails.ts";

export function createRedisKey(
  movieName: string,
  lang: string,
  type: string,
): string {
  const normalizedName = movieName.toLowerCase().trim();
  return lang && lang !== "en"
    ? `${type}:name:${lang}:${normalizedName}`
    : `${type}:name:${normalizedName}`;
}

export function createRedisIdKey(
  id: string,
  lang: string,
  type: string,
): string {
  const normalizedId = id.toLowerCase().trim();
  return lang && lang !== "en"
    ? `${type}:id:${lang}:${normalizedId}`
    : `${type}:id:${normalizedId}`;
}

export async function tryGetFromCache(
  redisKey: string,
  type: "movie" | "series",
  movieName: string
): Promise<Meta | null> {
  if (!redis) return null;
  try {
    const cachedRaw = await redis.get(redisKey);
    if (cachedRaw) {
      let cached: any;
      try {
        cached = cachedRaw;
      } catch (parseErr) {
        logError("Cache parse error", parseErr);
      }
      if (cached) {
        log(`Returning cached details for ${type}: ${movieName}`);
          return cached;
      }
    }
  } catch (err) {
    logError(`Redis cache error for ${type}: ${movieName}`, err);
  }
  return null;
}

export const shouldCache = (result: Meta): boolean => !!(result.poster && result.name);

export async function cacheResult(
  redisKey: string,
  type: "movie" | "series",
  lang: string,
  result: Meta
): Promise<boolean> {
  if (!redis) return false;
  try {
    const jsonResult = JSON.stringify(result);
    await Promise.all([
      redis.set(redisKey, jsonResult),
      result.id && lang === 'en' ? redis.set(`${type}:${result.id}`, jsonResult) : redis.set(`${type}:${lang}:${result.id}`, jsonResult),
    ]);
    log(`Cached details for ${type}: ${result.name}`);
    return true;
  } catch (err) {
    logError(`Error setting cache for ${type}: ${result.name}`, err);
    return false;
  }
}


export async function fetchTmdbDataId(
  imdbId: string,
  lang: string,
  type: "movie" | "series",
  tmdbKey: string,
  omdbKey: string
): Promise<Meta> {
  const tmdbType = type === "series" ? "tv" : "movie";

  const idUrl = `https://api.themoviedb.org/3/find?external_source=imdb_id${imdbId}&api_key=${tmdbKey}`;
  const idData = await fetchJson(idUrl, "TMDB id data");
  const tmdbId = idData?.tv_results?.[0]?.id || idData?.movie_results?.[0]?.id;

  // now that we have the tmdbId, we can hit the id route to get the metadata.
  const detailsUrl = `https://api.themoviedb.org/3/${tmdbId}&api_key=${tmdbKey}&lang=${lang}`
  const detailsData = await fetchJson(detailsUrl, "TMDB Details Data");
  

  let result: Meta = {
    id: "",
    poster: null,
    name: "",
    type,
    released: "",
    posterShape: "poster",
    language: "",
    country: "",
    background: "",
    description: "",
    runtime: "",
    genres: [],
    website: "",
  };

  if (imdbId) {
    const titleField = type === "series"
      ? (detailsData as TMDBSeriesDetails).name
      : (detailsData as TMDBMovieDetails).title;
    const dateField = type === "series"
      ? (detailsData as TMDBSeriesDetails).first_air_date
      : (detailsData as TMDBMovieDetails).release_date;
    const posterPath = detailsData.poster_path
      ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
      : null;
    const rawRuntime = type === "series"
      ? (detailsData as TMDBSeriesDetails).episode_run_time?.[0]
      : (detailsData as TMDBMovieDetails).runtime;
    const runtimeNumber = rawRuntime ?? undefined;
    const runtimeString = formatRuntime(runtimeNumber);
    const genres = detailsData.genres?.map((g) => g.name) || [];
    const background = detailsData.backdrop_path
      ? `https://image.tmdb.org/t/p/w500${detailsData.backdrop_path}`
      : "";
    const languageName = detailsData.spoken_languages?.[0]?.name || "";
    const country = (detailsData as TMDBSeriesDetails).origin_country?.[0] || "";
    const overview = detailsData.overview || "";

    // If key details are missing in English, try a fallback via Cinemeta.
    if (lang === 'en' && (!posterPath || !titleField || !dateField)) {
      log(`Fetching from Cinemeta. IMDB ID: ${imdbId}`);
      const cinemeta = await fetchCinemeta(type, imdbId) as Meta;
      result = cinemeta;
    } else {
      result = {
        ...result,
        id: imdbId,
        poster: posterPath,
        name: titleField,
        released: dateField ? dateField.split("-")[0] : "",
        language: languageName,
        country,
        background,
        description: overview,
        runtime: runtimeString,
        genres,
        website: detailsData.homepage || "",
      };
    }
  } else if (lang === 'en' && type === "movie") {
    log(`Falling back to OMDb for ${imdbId}`);
    result = await getOMDBMovieDetails(imdbId, omdbKey);
  }
  
  return result;
}

export async function fetchTmdbData(
  movieName: string,
  lang: string,
  type: "movie" | "series",
  tmdbKey: string,
  omdbKey: string
): Promise<Meta> {
  const tmdbType = type === "series" ? "tv" : "movie";
  const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${tmdbKey}&query=${encodeURIComponent(
    movieName
  )}&language=${lang}`;

  const searchData = await fetchJson(searchUrl, "TMDB search") as any;
  const firstResult = searchData.results?.[0];

  if (!firstResult) {
    logError(`No results found for ${type}: ${movieName}`, searchData);
    return {
      id: "",
      poster: null,
      name: "",
      type,
      released: "",
      posterShape: "poster",
      language: "",
      country: "",
      background: "",
      description: "",
      runtime: "",
      genres: [],
      website: "",
    };
  }

  const detailsUrl = `https://api.themoviedb.org/3/${tmdbType}/${firstResult.id}?api_key=${tmdbKey}&append_to_response=external_ids&language=${lang}&include_image_language=${lang}`;
  const detailsData = await fetchJson(detailsUrl, "TMDB details") as TMDBMovieDetails | TMDBSeriesDetails;
  const imdbId = detailsData.external_ids?.imdb_id ?? "";

  let result: Meta = {
    id: "",
    poster: null,
    name: "",
    type,
    released: "",
    posterShape: "poster",
    language: "",
    country: "",
    background: "",
    description: "",
    runtime: "",
    genres: [],
    website: "",
  };

  if (imdbId) {
    const titleField = type === "series"
      ? (detailsData as TMDBSeriesDetails).name
      : (detailsData as TMDBMovieDetails).title;
    const dateField = type === "series"
      ? (detailsData as TMDBSeriesDetails).first_air_date
      : (detailsData as TMDBMovieDetails).release_date;
    const posterPath = detailsData.poster_path
      ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
      : null;
    const rawRuntime = type === "series"
      ? (detailsData as TMDBSeriesDetails).episode_run_time?.[0]
      : (detailsData as TMDBMovieDetails).runtime;
    const runtimeNumber = rawRuntime ?? 0;
    const runtimeString = formatRuntime(runtimeNumber);
    const genres = detailsData.genres?.map((g) => g.name) || [];
    const background = detailsData.backdrop_path
      ? `https://image.tmdb.org/t/p/w500${detailsData.backdrop_path}`
      : "";
    const languageName = detailsData.spoken_languages?.[0]?.name || "";
    const country = (detailsData as TMDBSeriesDetails).origin_country?.[0] || "";
    const overview = detailsData.overview || "";

    // If key details are missing in English, try a fallback via Cinemeta.
    if (lang === 'en' && (!posterPath || !titleField || !dateField)) {
      log(`Fetching from Cinemeta. IMDB ID: ${imdbId}`);
      const cinemeta = await fetchCinemeta(type, imdbId) as Meta;
      result = cinemeta;
    } else {
      result = {
        ...result,
        id: imdbId,
        poster: posterPath,
        name: titleField,
        released: dateField ? dateField.split("-")[0] : "",
        language: languageName,
        country,
        background,
        description: overview,
        runtime: runtimeString,
        genres,
        website: detailsData.homepage || "",
      };
    }
  } else if (lang === 'en' && type === "movie") {
    log(`Falling back to OMDb for ${movieName}`);
    result = await getOMDBMovieDetails(movieName, omdbKey);
  }
  
  return result;
}
