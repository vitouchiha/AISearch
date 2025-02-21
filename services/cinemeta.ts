import { TMDBDetails } from "../config/types/types.ts";
import { fetchJson, logError, validatePosterUrl } from "../utils/utils.ts";

export const fetchCinemeta = async (
  type: string,
  id: string,
): Promise<TMDBDetails | null> => {
  const url = `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;

  try {
    const { meta } = (await fetchJson(url, "Cinemeta")) || {};
    if (!meta) return null;

    let posterUrl = meta.poster;
    if (posterUrl) {
      const isValidPoster = await validatePosterUrl(posterUrl);
      if (!isValidPoster) {
        posterUrl = null;
      }
    }

    return {
      id: meta.id,
      poster: posterUrl,
      showName: meta.name,
      year: meta.released,
      type: meta.type,
    } as TMDBDetails;
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