import { AI_MODEL, SEARCH_COUNT } from "../config/env.ts";
import { log } from "../utils/utils.ts";
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
  const prompt = `
  You are an expert ${recommendationType} recommendation system.
  For the search query provided, return exactly ${SEARCH_COUNT} unique ${recommendationType} recommendations as a raw JSON array.
  Each element in the array must be a ${type === "series" ? "TV series name" : "movie name"} (string).
  Do not include any additional text, formatting, or explanation. Ensure the JSON is valid and properly escaped.
  
  If the search query is vague or unclear, interpret it broadly or provide recommendations across multiple genres.
  If there are fewer than ${SEARCH_COUNT} relevant recommendations, return as many as possible without repeating any names.
  
  Search Query: ${searchQuery}
  `;

  log(`Sending prompt: ${prompt}`);

  const recommendationsSchema = z.array(z.string());
  const { object: recommendations } = await generateObject({
    model: movieRecommender,
    schema: recommendationsSchema,
    prompt,
  });

  log(`Parsed ${recommendations.length} ${recommendationType} names`);
  log(`\n\nRecommendations: ${recommendations}\n\n`);

  return recommendations;
}