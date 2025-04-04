import { SEARCH_COUNT } from "../config/env.ts";
import { log, logError } from "../utils/utils.ts";
import { generateObject, generateText, z } from "../config/deps.ts";
import { getAIModel, ProviderType } from './aiProvider.ts';
import { type Meta } from "../config/types/meta.ts";

interface RecommendationsResult {
  recommendations: string[];
  lang: string;
  error?: string | unknown;
}

async function getRecommendationsHelper(
  prompt: string,
  providerInfo: { provider: ProviderType; apiKey: string; model?: string },
  recommendationType: string
): Promise<RecommendationsResult> {
  const aiModel = getAIModel(providerInfo.provider, providerInfo.apiKey, providerInfo.model, true);
  log(`Sending prompt: ${prompt}`);

  const recommendationsSchema = z.object({
    recommendations: z.array(z.string()),
    lang: z.string(),
  });

  try {
    let result: any;

    if (providerInfo.provider === "featherless") {

      const resultText = await generateText({
        model: aiModel,
        prompt,
      });

      let jsonString = "";
      if (typeof resultText === "object" && resultText.text) {
        jsonString = resultText.text;
      } else if (typeof resultText === "string") {
        jsonString = resultText;
      } else {
        logError("Unexpected featherless output format", resultText);
        return { recommendations: [], lang: "", error: "Unexpected featherless output format" };
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (e) {
        logError("Failed to parse JSON from featherless text output:", e);
        return { recommendations: [], lang: "", error: "Invalid JSON output from featherless" };
      }

      // sometimes it renames? WTF;
      if (!parsed.lang && parsed.langs) {
        parsed.lang = parsed.langs;
      }
      result = parsed;
    } else {

      const { object: generatedResult } = await generateObject({
        model: aiModel,
        schema: recommendationsSchema,
        schemaName: "recommendations",
        prompt,
      });
      result = generatedResult;
    }

    const { recommendations, lang } = result;
    if (!Array.isArray(recommendations) || recommendations.length === 0 || typeof recommendations[0] !== "string") {
      log(`No valid ${recommendationType} recommendations found`);
      return { recommendations: [], lang };
    }

    log(`Parsed ${recommendations.length} ${recommendationType} names`);
    log(`Recommendations: ${recommendations.join(", ")}`);
    log(`Raw result from AI:\n${JSON.stringify(result) || result}`);
    return result;
  } catch (error) {
    logError(`Error with provider ${providerInfo.provider}:`, error);
    return { recommendations: [], lang: "", error: error || "Error unknown." };
  }
}


export async function getTraktMovieRecommendations(movies: string, watchedList: string, type: string, providerInfo: { provider: ProviderType; apiKey: string, model?: string, }): Promise<RecommendationsResult> {

  if (movies.length === 0) {
    log('Movies is empty.')
    return { recommendations: [], lang: '' };
  }

  const recommendationType = type === 'series' ? 'TV series' : 'movies';
  const prompt = `
    You are an expert ${recommendationType} recommendation system.
    Based on the list provided, return exactly ${SEARCH_COUNT} unique ${recommendationType} recommendations as a raw JSON object.
    Have the content complement each other. The user will give you their watched list of shows they have watched. Give them your recommendations based on this.
    The object must have a single property "recommendations" which is an array of ${type === 'series' ? 'TV series names' : 'movie names'}.
    Do not include any additional text or explanation. Give your responses in the language of the search query.
    
    ${watchedList.length > 0 ? `Exclude these ${recommendationType} as I have already seen them: ${watchedList}` : ''}

    Return ISO 639-1 standard 2 letter code determined by the language of th search query under the property "lang".
    
    Users watched list: ${movies}
  `.trim().replace(/\n\s*\n/g, "\n");

  return await getRecommendationsHelper(prompt, providerInfo, recommendationType);
}

export async function getMovieRecommendations(searchQuery: string, watchedList: string, type: string, providerInfo: { provider: ProviderType; apiKey: string, model?: string }): Promise<RecommendationsResult> {
  if (searchQuery.length > 400 || searchQuery.length === 0) return { recommendations: [], lang: '' };

  const recommendationType = type === "series" ? "TV series" : "movies";
  const prompt = `
    You are an expert ${recommendationType} recommendation system.
    For the search query provided, return exactly ${SEARCH_COUNT} unique ${recommendationType} recommendations as a raw JSON object.
    The object must have a single property "recommendations" which is an array of ${type === "series" ? "TV series names" : "movie names"} (strings).
    Do not include any additional text, formatting, or explanation. Ensure the JSON is valid and properly escaped.
    
    If the search query is vague or unclear, interpret it broadly or provide recommendations across multiple genres.
    If there are fewer than ${SEARCH_COUNT} relevant recommendations, return as many as possible without repeating any names.

    ${watchedList.length > 0 ? `Exclude these ${recommendationType} as I have already seen them: ${watchedList}` : ''}

    Give your responses in the language of the search query.
    Return ISO 639-1 standard 2 letter code determined by the language of the search query under the property "lang".
    
    Search Query: ${searchQuery}
  `.trim().replace(/\n\s*\n/g, "\n");

  return await getRecommendationsHelper(prompt, providerInfo, recommendationType);
}


export const metaSchema = z.object({
  id: z.string(),
  poster: z.string(),
  name: z.string(),
  type: z.string(),
  released: z.string(),
  posterShape: z.enum(["square", "poster", "landscape"]),
  language: z.string(),
  country: z.string(),
  background: z.string(),
  description: z.string(),
  runtime: z.string(),
  genres: z.array(z.string()),
  website: z.string(),
});

export const reducedMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export async function translateMetaLanguage(
  metas: { id: string; name: string; description: string }[],
  lang: string,
  providerInfo: { provider: ProviderType; apiKey: string; model?: string }
): Promise<{ id: string; name: string; description: string }[]> {
  // Build the prompt with only the necessary fields
  const prompt = `
Translate this JSON array of meta objects (only id, name, and description) into ISO 639-1 language "${lang}":
${JSON.stringify(metas)}

Return the exact same JSON array in the exact same format.
  `
    .trim()
    .replace(/\n\s*\n/g, "\n");

  const reducedMetaArraySchema = z.array(reducedMetaSchema);

  // Use a helper function that accepts a custom schema (here, the reduced schema)
  return await getTranslatedMetaHelper(prompt, providerInfo, reducedMetaArraySchema);
}

async function getTranslatedMetaHelper(
  prompt: string,
  providerInfo: { provider: ProviderType; apiKey: string; model?: string },
  schema: z.ZodTypeAny
): Promise<any[]> {
  const aiModel = getAIModel(
    providerInfo.provider,
    providerInfo.apiKey,
    providerInfo.model,
    true
  );
  log(`Sending prompt: ${prompt}`);

  try {
    let result: any;

    if (providerInfo.provider === "featherless") {
      const resultText = await generateText({
        model: aiModel,
        prompt,
      });

      let jsonString = "";
      if (typeof resultText === "object" && resultText.text) {
        jsonString = resultText.text;
      } else if (typeof resultText === "string") {
        jsonString = resultText;
      } else {
        logError("Unexpected featherless output format", resultText);
        throw new Error("Unexpected featherless output format");
      }

      try {
        result = JSON.parse(jsonString);
      } catch (e) {
        logError("Failed to parse JSON from featherless text output:", e);
        throw new Error("Invalid JSON output from featherless");
      }
    } else {
      const { object: generatedResult } = await generateObject({
        model: aiModel,
        schema: schema,
        schemaName: "reducedMetaArray",
        prompt,
      });
      result = generatedResult;
    }

    log(`Translated meta objects: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    logError(`Error with provider ${providerInfo.provider}:`, error);
    throw error;
  }
}