import { AI_MODEL, DEV_MODE } from "../config/env.ts";
import { createGoogleGenerativeAI, generateText } from "../config/deps.ts";

export async function getMovieRecommendations(searchQuery: string, googleKey: string): Promise<string[]> {
  const google = createGoogleGenerativeAI({ apiKey: googleKey });
  const movieRecommender = google(AI_MODEL, { structuredOutputs: true });

  // Limit search query length
  if (searchQuery.length > 400) return [];

  const prompt = `You are an expert movie recommendation system.
For the search query provided, return exactly 20 movie recommendations as a raw JSON array.
Each element in the array must be a movie name (string).
Do not include any additional text, formatting, or explanation. Do not repeat any names.
Search Query: ${searchQuery}`;

  DEV_MODE && console.log(`[${new Date().toISOString()}] Sending prompt: ${prompt}`);

  const { text: rawResponse } = await generateText({ model: movieRecommender, prompt });
  DEV_MODE && console.log(`[${new Date().toISOString()}] Raw response: ${rawResponse}`);

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
    if (!Array.isArray(recommendations)) throw new Error("Response is not an array");
  } catch (jsonError: unknown) {
    throw jsonError instanceof Error
      ? new Error("Failed to parse recommendations JSON: " + jsonError.message)
      : new Error("Failed to parse recommendations JSON (unknown error).");
  }

  console.log(`[${new Date().toISOString()}] Parsed ${recommendations.length} movie names`);
  return recommendations;
}