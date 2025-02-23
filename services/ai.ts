import { SEARCH_COUNT } from "../config/env.ts";
import { log, logError } from "../utils/utils.ts";
import { generateObject, z } from "../config/deps.ts";
import { getAIModel, ProviderType } from './aiProvider.ts'


export async function getTraktMovieRecommendations(
  movies: string,
  type: string,
  providerInfo: { provider: ProviderType; apiKey: string }
): Promise<string[]> {
  if (movies.length > 400) {
    log('Input exceeds maximum length');
    return [];
  }

  const recommendationType = type === 'series' ? 'TV series' : 'movies';
  const prompt = `
    You are an expert ${recommendationType} recommendation system.
    Based on the list provided, return exactly ${SEARCH_COUNT} unique ${recommendationType} recommendations as a raw JSON object.
    The object must have a single property "recommendations" which is an array of ${type === 'series' ? 'TV series names' : 'movie names'}.
    Do not include any additional text or explanation.
    
    Search Query: ${movies}
  `;

  log(`Sending prompt: ${prompt}`);

  // Wrap the array in an object so that the schema is of type "object"
  const recommendationsSchema = z.object({
    recommendations: z.array(z.string()),
  });
  
  const model = getAIModel(providerInfo.provider, providerInfo.apiKey, true);

  try {
    const { object: result } = await generateObject({
      model,
      schema: recommendationsSchema,
      schemaName: 'recommendations',
      schemaDescription: `A list of ${recommendationType} recommendations`,
      prompt,
    });
    
    const recommendations = result.recommendations;
    if (!Array.isArray(recommendations) || recommendations.length === 0 || typeof recommendations[0] !== 'string') {
      log(`No valid ${recommendationType} recommendations found`);
      return [];
    }

    log(`Parsed ${recommendations.length} ${recommendationType} names`);
    log(`Recommendations: ${recommendations.join(', ')}`);
    return recommendations;
  } catch (error) {
    logError(`Error with provider ${providerInfo.provider}:`, error);
    return [];
  }
}

export async function getMovieRecommendations(
  searchQuery: string,
  type: string,
  providerInfo: { provider: ProviderType; apiKey: string }
): Promise<string[]> {

  if (searchQuery.length > 400) return [];

  const aiModel = getAIModel(providerInfo.provider, providerInfo.apiKey, true);

  const recommendationType = type === "series" ? "TV series" : "movies";
  const prompt = `
  You are an expert ${recommendationType} recommendation system.
  For the search query provided, return exactly ${SEARCH_COUNT} unique ${recommendationType} recommendations as a raw JSON object.
  The object must have a single property "recommendations" which is an array of ${type === "series" ? "TV series names" : "movie names"} (strings).
  Do not include any additional text, formatting, or explanation. Ensure the JSON is valid and properly escaped.
  
  If the search query is vague or unclear, interpret it broadly or provide recommendations across multiple genres.
  If there are fewer than ${SEARCH_COUNT} relevant recommendations, return as many as possible without repeating any names.
  
  Search Query: ${searchQuery}
  `;

  log(`Sending prompt: ${prompt}`);

  const recommendationsSchema = z.object({
    recommendations: z.array(z.string()),
  });

  const { object: result } = await generateObject({
    model: aiModel,
    schema: recommendationsSchema,
    prompt,
  });

  const recommendations = result.recommendations;

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    log(`No ${recommendationType} recommendations found`);
    return [];
  }

  log(`Parsed ${recommendations.length} ${recommendationType} names`);
  log(`\n\nRecommendations: ${recommendations}\n\n`);

  return recommendations;
}