import type { Meta } from "../config/types/meta.ts";
import { fetchJson, logError, validatePosterUrl } from "../utils/utils.ts";

export const fetchCinemeta = async (type: string, id: string): Promise<Meta | null> => {
  const url = `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;

  try {
    const data = await fetchJson(url, "Cinemeta");
    if (!data?.meta) return null;

    const c = data.meta; 

    let poster = c.poster;
    if (poster) {
      const isValid = await validatePosterUrl(poster);
      if (!isValid) poster = null;
    }

    const result: Meta = {
      
      id: c.id,
      type: c.type,
      name: c.name,
      genres: c.genres,            
      poster,                      // either valid URL or null
      posterShape: c.posterShape || "poster",     
      background: c.background,
      logo: c.logo,
      description: c.description,
      releaseInfo: c.releaseInfo,
      director: c.director ?? undefined, 
      cast: c.cast,                     
      imdbRating: c.imdbRating,
      released: c.released,
      runtime: c.runtime,
      language: c.language,
      country: c.country,
      awards: c.awards ?? undefined,
      website: c.website || undefined, 
    };

    return result;
  } catch (error) {
    logError("Error fetching Cinemeta poster:", error);
    return null;
  }
};


export async function cinemetaHealthCheck() {
  try {
    const cinemetaResponse = await fetch("https://v3-cinemeta.strem.io/meta/movie/tt0111161.json", { method: "HEAD" });
    return cinemetaResponse.ok;
  } catch (error) {
    console.error("Cinemeta health check failed:", error);
    return false;
  }
}