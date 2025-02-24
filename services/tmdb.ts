import { TMDB_API_KEY, NO_CACHE } from "../config/env.ts";
import { redis } from "../config/redisCache.ts";
import { fetchCinemeta } from "./cinemeta.ts";
import { getOMDBMovieDetails } from "./omdb.ts";
import { fetchJson, formatRuntime, log, logError } from "../utils/utils.ts";
import { isOldCacheStructure, convertOldToNewStructure } from "./tmdbHelpers/fixOldCache.ts";
import { fetchNewDataInBackground } from "./tmdbHelpers/fetchNewDataInBackground.ts";

import type { Meta } from "../config/types/meta.ts";
import type { TMDBMovieDetails } from "../config/types/TMDBMovieDetails.ts";
import type { TMDBSeriesDetails } from "../config/types/TMDBSeriesDetails.ts";

interface TmdbFetchResult {
  data: Meta;
  fromCache: boolean;
  cacheSet: boolean;
}

const useCache = NO_CACHE !== "true";


export async function getTmdbDetailsByName(
  movieName: string,
  lang: string,
  type: "movie" | "series",
  tmdbKey: string,
  omdbKey: string,
): Promise<TmdbFetchResult> {
  const normalizedName = movieName.toLowerCase().trim();
  const redisKey =
    lang && lang !== "en"
      ? `${type}:name:${lang}:${normalizedName}`
      : `${type}:name:${normalizedName}`;

  // Check cache first
  if (useCache && redis) {
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

          if (isOldCacheStructure(cached)) {
            const converted = convertOldToNewStructure(cached, type);

            fetchNewDataInBackground(type, movieName, lang, tmdbKey, omdbKey, redisKey)
              .then(() => {
                log("Background cache updated.");
              })
              .catch((err) => {
                logError("Background update error", err);
              });

            return { data: converted, fromCache: true, cacheSet: false };
          } else {
            return { data: cached, fromCache: true, cacheSet: false };
          }
        }
      }
    } catch (err) {
      logError(`Redis cache error for ${type}: ${movieName}`, err);
    }
  }

  log(`Fetching TMDB details for ${type}: ${movieName}`);
  try {
    const tmdbType = type === "series" ? "tv" : "movie";
    const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${tmdbKey}&query=${encodeURIComponent(
      movieName
    )}&language=${lang}`;

    const searchData = await fetchJson(searchUrl, "TMDB search");
    const firstResult = searchData.results?.[0];

    if (!firstResult) {
      logError(`No results found for ${type}: ${movieName}`, searchData);
      return {
        data: {
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
        },
        fromCache: false,
        cacheSet: false,
      };
    }

    const detailsUrl = `https://api.themoviedb.org/3/${tmdbType}/${firstResult.id}?api_key=${tmdbKey}&append_to_response=external_ids&language=${lang}`;
    const detailsData = (await fetchJson(detailsUrl, "TMDB details")) as
      | TMDBMovieDetails
      | TMDBSeriesDetails;

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

      const language = detailsData.spoken_languages?.[0]?.name || "";
      const country = (detailsData as TMDBSeriesDetails).origin_country?.[0] || "";
      const overview = detailsData.overview || "";

      if (!posterPath || !titleField || !dateField) {
        log(`Fetching from Cinemeta. IMDB ID: ${imdbId}`);
        const cinemeta = await fetchCinemeta(type, imdbId);
        result = {
          ...result,
          id: imdbId,
          poster: cinemeta?.poster || posterPath,
          name: cinemeta?.showName || titleField || "",
          released: cinemeta?.year ? String(cinemeta.year).split("-")[0] : "",
        };
      } else {
        result = {
          ...result,
          id: imdbId,
          poster: posterPath,
          name: titleField,
          released: dateField ? dateField.split("-")[0] : "",
          language,
          country,
          background,
          description: overview,
          runtime: runtimeString,
          genres,
          website: detailsData.homepage || "",
        };
      }
    } else if (type === "movie") {
      log(`Falling back to OMDb for ${movieName}`);
      result = await getOMDBMovieDetails(movieName, omdbKey);
    }

    let cacheSet = false;
    if (useCache && result.poster && redis) {
      try {
        const jsonResult = JSON.stringify(result);
        await Promise.all([
          redis.set(redisKey, jsonResult),
          lang === "en" && result.id
            ? redis.set(`${type}:${result.id}`, jsonResult)
            : Promise.resolve(null),
        ]);
        log(`Cached details for ${type}: ${movieName}`);
        cacheSet = true;
      } catch (err) {
        logError(`Error setting cache for ${type}: ${movieName}`, err);
        return {
          data: {
            ...result,
            id: "",
            poster: null,
            name: "",
            released: "",
          },
          fromCache: false,
          cacheSet: false,
        };
      }
    }

    return { data: result, fromCache: false, cacheSet };
  } catch (err) {
    logError(`Error fetching TMDB details for ${type}: ${movieName}`, err);
    return {
      data: {
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
      },
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