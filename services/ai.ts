import { getTmdbDetailsByName } from "../services/tmdb.ts";
import { buildMeta } from "../services/meta.ts";
import type { Recommendation, Meta } from "../config/types.ts";
import { AI_MODEL } from "../config/env.ts";
import { createGoogleGenerativeAI, generateText } from "../config/deps.ts";



/**
 * Generates movie recommendations by building a prompt,
 * calling the AI, cleaning the output, parsing JSON,
 * and enriching each recommendation using the movie name.
 *
 * The prompt instructs the AI to return exactly 20 movie names (strings)
 * in a raw JSON array.
 *
 * @param searchQuery - The search query string.
 * @returns A Promise that resolves to an object with metas.
 */
export async function generateMovieRecommendations(
  searchQuery: string,
  googleKey: string
): Promise<{ metas: Meta[] }> {

  const google = createGoogleGenerativeAI({ apiKey: googleKey });
  const movieRecommender = google(AI_MODEL, {
    structuredOutputs: true,
    
  });

  // Stop people from sending tons of shit.
  if (searchQuery.length > 400) return { metas: [] };

  const prompt = `You are an expert movie recommendation system.
For the search query provided, return exactly 20 movie recommendations as a raw JSON array.
Each element in the array must be a movie name (string).
Do not include any additional text, formatting, or explanation. Do not repeat any names.
Search Query: ${searchQuery}`;

  console.log(`[${new Date().toISOString()}] Sending prompt: ${prompt}`);

  const { text: rawResponse } = await generateText({
    model: movieRecommender,
    prompt,
  });
  console.log(`[${new Date().toISOString()}] Raw response: ${rawResponse}`);

  let cleanedResponse = rawResponse.trim();
  if (cleanedResponse.startsWith("```json")) {
    cleanedResponse = cleanedResponse
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
  }

  let recommendations: string[];
  try {
    recommendations = JSON.parse(cleanedResponse);
    if (!Array.isArray(recommendations)) {
      throw new Error("Response is not an array");
    }
    if (recommendations.length !== 20) {
      throw new Error("Response does not contain exactly 20 movie names");
    }
  } catch (jsonError: any) {
    throw new Error("Failed to parse recommendations JSON: " + jsonError.message);
  }
  console.log(
    `[${new Date().toISOString()}] Parsed ${recommendations.length} movie names`
  );

  const metas = await Promise.all(
    recommendations.map(async (movieName, index) => {
      console.log(
        `[${new Date().toISOString()}] Processing recommendation ${index + 1} for movie: ${movieName}`
      );
      const tmdbData = await getTmdbDetailsByName(movieName);
      return buildMeta({ imdb_id: tmdbData.id } as Recommendation, tmdbData);
    })
  );
  const validMetas = metas.filter((meta): meta is Meta => meta !== null);
  return { metas: validMetas };
}
