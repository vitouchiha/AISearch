import type { TMDBDetails } from "../config/types/types.ts";

export async function getOMDBMovieDetails(title: string, apiKey: string): Promise<TMDBDetails> {
    const url = `http://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const result: TMDBDetails = {
        id: data.imdbID || "",
        poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
        showName: data.Title || null,
        year: data.Year && data.Year !== "N/A" ? data.Year : null,
    };
    return result;
}