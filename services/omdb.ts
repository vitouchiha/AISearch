import type { Meta } from "../config/types/meta.ts";

export async function getOMDBMovieDetails(title: string, apiKey: string): Promise<Meta> {
    const url = `http://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const result: Meta = {
        id: data.imdbID || "",
        type: "movie",
        poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
        name: data.Title || null,
        released: data.Year && data.Year !== "N/A" ? data.Year : null,
    };
    return result;
}