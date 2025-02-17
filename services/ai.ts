import { AI_MODEL, DEV_MODE, SEARCH_COUNT } from "../config/env.ts";
import { createGoogleGenerativeAI, generateObject, z } from "../config/deps.ts";

export async function getMovieRecommendations(
  searchQuery: string,
  type: string,
  googleKey: string,
): Promise<string[]> {

  // Prevent abuse by limiting query length.
  if (searchQuery.length > 400) return [];

  const google = createGoogleGenerativeAI({ apiKey: googleKey });
  const movieRecommender = google(AI_MODEL, { structuredOutputs: true });

  const recommendationType = type === "series" ? "TV series" : "movies";
  const prompt = `You are an expert ${recommendationType} recommendation system.
For the search query provided, return exactly ${SEARCH_COUNT} ${recommendationType} recommendations as a raw JSON array.
Each element in the array must be a ${type === "tv" ? "TV series name" : "movie name"} (string).
Do not include any additional text, formatting, or explanation. Do not repeat any names.
Search Query: ${searchQuery}`;

  DEV_MODE &&
    console.log(
      `[${new Date().toISOString()}] Sending prompt: ${prompt}`
    );

  // using this completely fixes the issues with parsing weird responses.
  // It seems slightly faster too. But that may just be running local.

  const recommendationsSchema = z.array(z.string());
  const { object: recommendations } = await generateObject({
    model: movieRecommender,
    schema: recommendationsSchema,
    prompt,
  });

  DEV_MODE &&
    console.log(
      `[${new Date().toISOString()}] Parsed ${recommendations.length} ${recommendationType} names`
    );
  DEV_MODE &&
    console.log(
      `\n\n[${new Date().toISOString()}] Recommendations: ${recommendations}\n\n`
    );

  return recommendations;
}