import { logError, validatePosterUrl } from "../utils/utils.ts";
import { RPDB_FREE_API_KEY } from "../config/env.ts";
import type { Meta } from "../config/types/meta.ts";

//import { cacheImageCloud } from "../config/s3.ts";

const API_URL = "https://api.ratingposterdb.com";

interface TierResponse {
  tier: number;
}

interface PosterResponse {
  poster: string | null;
}

// Looks to me like RatingPoster hasn't implemented the tier system yet, so we can just comment this out for now.
const checkKey = (key: string): TierResponse | null => {
  if (!key) return null;

  //const url = `${API_URL}/${key}/requests`;

  try {
    //   const response = await fetch(url);
    //   if (!response.ok) {
    //     const errorText = await response.text();
    //     console.error(`RPDB key check failed: ${response.status} ${response.statusText}. Response text: ${errorText}`);
    //     return null;
    //   }
    //
    //   // Log the raw response text before parsing
    //   const rawResponse = await response.text();
    //   console.log("Raw response:", rawResponse);
    //
    //   let data;
    //   try {
    //     data = JSON.parse(rawResponse);
    //   } catch (parseError) {
    //     console.error("Failed to parse JSON:", parseError);
    //     return null;
    //   }
    //
    //   if (!data) {
    //     console.error("RPDB key check failed: no data returned");
    //     return null;
    //   }
    //
    //   const { req, limit } = data;
    //   if (req === undefined || limit === undefined) {
    //     console.error("Expected fields 'req' and 'limit' not found in data");
    //     return null;
    //   }
    //
    //   if (req >= limit) {
    //     console.error(`Request limit reached: req = ${req}, limit = ${limit}`);
    //     return null;
    //   }

    const tierMapping: Record<string, number> = {
      "t0": 0,
      "t1": 1,
      "t2": 2,
      "t3": 3,
      "t4": 4,
    };

    const tier = Object.entries(tierMapping).find(([prefix]) =>
      key.startsWith(prefix)
    )?.[1] ?? null;

    return tier !== null ? { tier } : null;
  } catch (error) {
    logError("Error in checkKey:", error);
    return null;
  }
};

export const getRpdbPoster = async (
  imdbId: string,
  rpdbKey: string,
): Promise<PosterResponse> => {
  const keyCheck = checkKey(rpdbKey);
  if (!keyCheck || typeof keyCheck.tier !== "number") return { poster: null };

  const { tier } = keyCheck;

  const url = tier >= 3
    ? `${API_URL}/${rpdbKey}/imdb/rating-order/${imdbId}.jpg?order=myanimelist%2Cimdb%2Ccommonsense%2Cletterboxd`
    : `${API_URL}/${rpdbKey}/imdb/poster-default/${imdbId}.jpg`;

  //const cachePoster = await cacheImageCloud(url, imdbId);
  //return { poster: cachePoster };


  const isValidPoster = await validatePosterUrl(url);
  if (!isValidPoster) {
    return { poster: null };
  }

  return { poster: url };
};

export async function updateRpdbPosters(
  metas: Meta[],
  rpdbKey: string,
): Promise<void> {
  await Promise.all(
    metas.map(async (meta) => {
      if (meta.id) {
        try {
          const rpdbPoster = await getRpdbPoster(meta.id, rpdbKey);
          if (rpdbPoster?.poster) {
            meta.poster = rpdbPoster.poster;
          }
        } catch (error) {
          logError(`Error fetching rpdb poster for id ${meta.id}:`, error);
        }
      }
    }),
  );
}

export async function rpdbHealthCheck() {
  try {
    const ratePostersResponse = await fetch(`https://api.ratingposterdb.com/${RPDB_FREE_API_KEY}/isValid`, { method: "HEAD" });
    return ratePostersResponse.ok;
  } catch (error) {
    console.error("RatePosters health check failed:", error);
    return false;
  }
}