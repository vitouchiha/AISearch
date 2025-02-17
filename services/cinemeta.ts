import { TMDBDetails } from "../config/types/types.ts";
import { fetchJson, logError } from "../utils/utils.ts";

export const fetchCinemeta = async (
  type: string,
  id: string,
): Promise<TMDBDetails | null> => {
  const url = `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;

  try {
    const { meta } = (await fetchJson(url, "Cinemeta")) || {};
    if (!meta) return null;

    // Check if the poster URL is active.
    let posterUrl = meta.poster;
    if (posterUrl) {
      try {
        const headResponse = await fetch(posterUrl, { method: "HEAD" });
        if (!headResponse.ok) {
          posterUrl = null;
        }
      } catch (err) {
        logError(
          `Error checking Cinemeta poster URL with HEAD request: ${posterUrl}`,
          err
        );
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

