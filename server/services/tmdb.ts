import { TMDB_API_KEY } from "../config/env.ts";

export async function tmdbHealthCheck(tmdbKey = TMDB_API_KEY){
  try {
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbKey}`, { method: "HEAD" });
    return tmdbResponse.ok; 
  } catch (error) {
    console.error("TMDB health check failed:", error);
    return false;
  }
}