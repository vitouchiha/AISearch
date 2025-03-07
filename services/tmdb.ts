import { TMDB_API_KEY } from "../config/env.ts";

import type { Meta } from "../config/types/meta.ts";
import { fetchTmdbData } from "./tmdbHelpers/tmdbCommon.ts";

export async function getTmdbDetailsByName(
  movieName: string,
  lang: string,
  type: "movie" | "series",
  tmdbKey: string,
  omdbKey: string
): Promise<{ data: Meta; fromCache: boolean; }> {

  // this is now a left over function from before.. will get rid it out but not right now 

  const result = await fetchTmdbData(movieName, lang, type, tmdbKey, omdbKey);
  
  return { data: result, fromCache: false };
}



export async function tmdbHealthCheck(tmdbKey = TMDB_API_KEY){
  try {
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbKey}`, { method: "HEAD" });
    return tmdbResponse.ok; 
  } catch (error) {
    console.error("TMDB health check failed:", error);
    return false;
  }
}