import { fetchJson, logError, log } from "../../utils/utils.ts";
import { fetchCinemeta } from "../cinemeta.ts";
import { getOMDBMovieDetails } from "../omdb.ts";
import { redis } from "../../config/redisCache.ts";
import type { Meta } from "../../config/types/meta.ts";
import type { TMDBMovieDetails } from "../../config/types/TMDBMovieDetails.ts";
import type { TMDBSeriesDetails } from "../../config/types/TMDBSeriesDetails.ts";

export async function fetchNewDataInBackground(
  type: "movie" | "series",
  movieName: string,
  lang: string,
  tmdbKey: string,
  omdbKey: string,
  redisKey: string,
): Promise<void> {
  try {
    // Do the main fetch logic for TMDB, same logic as in your main function but without returning.
    const tmdbType = type === "series" ? "tv" : "movie";
    const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}?api_key=${tmdbKey}&query=${encodeURIComponent(
      movieName
    )}&language=${lang}`;

    const searchData = await fetchJson(searchUrl, "TMDB search") as any;
    const firstResult = searchData.results?.[0];

    if (!firstResult) {
      logError(`No results found (background) for ${type}: ${movieName}`, searchData);
      return;
    }

    const detailsUrl = `https://api.themoviedb.org/3/${tmdbType}/${firstResult.id}?api_key=${tmdbKey}&append_to_response=external_ids&language=${lang}`;
    const detailsData = await fetchJson(detailsUrl, "TMDB details") as TMDBMovieDetails | TMDBSeriesDetails;
    const imdbId = detailsData.external_ids?.imdb_id || "";

    // Create a fresh new Meta object as usual.
    let updated: Meta = {
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
      const titleField = type === "series" ? (detailsData as TMDBSeriesDetails).name : (detailsData as TMDBMovieDetails).title;
      const dateField = type === "series"
        ? (detailsData as TMDBSeriesDetails).first_air_date
        : (detailsData as TMDBMovieDetails).release_date;

      const posterPath = detailsData.poster_path
        ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
        : null;

      const runtime = type === "series"
        ? String((detailsData as TMDBSeriesDetails).episode_run_time?.[0] || "0")
        : String((detailsData as TMDBMovieDetails).runtime || "0");

      const genres = detailsData.genres?.map((g) => g.name) || [];
      const background = detailsData.backdrop_path
        ? `https://image.tmdb.org/t/p/w500${detailsData.backdrop_path}`
        : "";
      const language = detailsData.spoken_languages?.[0]?.name || "";
      const country = (detailsData as TMDBSeriesDetails).origin_country?.[0] || "";

      if (!posterPath || !titleField || !dateField) {
        log(`Fetching from Cinemeta (background). IMDB ID: ${imdbId}`);
        const cinemeta = await fetchCinemeta(type, imdbId);

        updated = {
          ...updated,
          id: imdbId,
          poster: cinemeta?.poster || posterPath,
          name: cinemeta?.showName || titleField || "",
          released: cinemeta?.year ? String(cinemeta.year).split("-")[0] : "",
        };
      } else {
        updated = {
          ...updated,
          id: imdbId,
          poster: posterPath,
          name: titleField,
          released: dateField.split("-")[0] || "",
          language,
          country,
          background,
          description: detailsData.overview || "",
          runtime,
          genres,
          website: detailsData.homepage || "",
        };
      }
    } else {
      // If no imdbId and it's a movie, fallback to OMDb
      if (type === "movie") {
        updated = await getOMDBMovieDetails(movieName, omdbKey);
      } else {
        log(`No IMDB ID found (background) for series: ${movieName}`);
      }
    }

    // Cache updated data (if possible)
    if (redis && updated.poster) {
      const jsonResult = JSON.stringify(updated);
      await Promise.all([
        redis.set(redisKey, jsonResult),
        updated.id && (lang === "en")
          ? redis.set(`${type}:${updated.id}`, jsonResult)
          : Promise.resolve(null),
      ]);
      log(`Background updated cache for ${type}: ${movieName}`);
    }
  } catch (err) {
    logError(`Background fetch error for ${type}: ${movieName}`, err);
  }
}