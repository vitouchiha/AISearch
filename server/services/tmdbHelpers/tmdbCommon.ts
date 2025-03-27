// tmdbCommon.ts
import { fetchJson, formatRuntime, log, logError } from "../../utils/utils.ts";
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

export const shouldCache = (result: Meta): boolean => !!(result.poster && result.name);

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
