import { SEARCH_COUNT } from "../config/env.ts";
import { log, logError } from "../utils/utils.ts";
import { generateObject, z } from "../config/deps.ts";
import { getAIModel, ProviderType } from './aiProvider.ts';

interface RecommendationsResult {
  recommendations: string[];
  lang: string;
  error?: string | unknown;
}

async function getRecommendationsHelper(
  prompt: string,
  providerInfo: { provider: ProviderType; apiKey: string },
  recommendationType: string
): Promise<RecommendationsResult> {

  const aiModel = getAIModel(providerInfo.provider, providerInfo.apiKey, true);
  log(`Sending prompt: ${prompt}`);

  const recommendationsSchema = z.object({
    recommendations: z.array(z.string()),
    lang: z.string(),
  });

  try {
    const { object: result } = await generateObject({
      model: aiModel,
      schema: recommendationsSchema,
      schemaName: 'recommendations',
      prompt,
    });

    const { recommendations, lang } = result;
    if (!Array.isArray(recommendations) || recommendations.length === 0 || typeof recommendations[0] !== 'string') {
      log(`No valid ${recommendationType} recommendations found`);
      return { recommendations: [], lang };
    }

    log(`Parsed ${recommendations.length} ${recommendationType} names`);
    log(`Recommendations: ${recommendations.join(', ')}`);
    log(`Raw result from AI:\n${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    logError(`Error with provider ${providerInfo.provider}:`, error);
    return { recommendations: [], lang: '', error: error || 'Error unknown.' };
  }
}

export async function getTraktMovieRecommendations(movies: string, type: string, providerInfo: { provider: ProviderType; apiKey: string }): Promise<RecommendationsResult> {

  if (movies.length > 400) {
    return { recommendations: [], lang: '' };
  }

  const recommendationType = type === 'series' ? 'TV series' : 'movies';
  const prompt = `
    You are an expert ${recommendationType} recommendation system.
    Based on the list provided, return exactly ${SEARCH_COUNT} unique ${recommendationType} recommendations as a raw JSON object.
    Have the content complement each other.
    The object must have a single property "recommendations" which is an array of ${type === 'series' ? 'TV series names' : 'movie names'}.
    Do not include any additional text or explanation. Give your responses in the language of the search query.
    
    Return ISO 639-1 standard 2 letter code determined by the language of th search query under the property "lang".
    
    Search Query: ${movies}
  `;

  return await getRecommendationsHelper(prompt, providerInfo, recommendationType);
}

export async function getMovieRecommendations(searchQuery: string, type: string, providerInfo: { provider: ProviderType; apiKey: string }): Promise<RecommendationsResult> {
  if (searchQuery.length > 400) return { recommendations: [], lang: '' };

  const recommendationType = type === "series" ? "TV series" : "movies";
  const prompt = `
    You are an expert ${recommendationType} recommendation system.
    For the search query provided, return exactly ${SEARCH_COUNT} unique ${recommendationType} recommendations as a raw JSON object.
    The object must have a single property "recommendations" which is an array of ${type === "series" ? "TV series names" : "movie names"} (strings).
    Do not include any additional text, formatting, or explanation. Ensure the JSON is valid and properly escaped.
    
    If the search query is vague or unclear, interpret it broadly or provide recommendations across multiple genres.
    If there are fewer than ${SEARCH_COUNT} relevant recommendations, return as many as possible without repeating any names.

    Give your responses in the language of the search query.
    Return ISO 639-1 standard 2 letter code determined by the language of the search query under the property "lang".
    
    Search Query: ${searchQuery}
  `;

  return await getRecommendationsHelper(prompt, providerInfo, recommendationType);
}