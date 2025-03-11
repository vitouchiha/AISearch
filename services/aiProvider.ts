import { createGoogleGenerativeAI, createOpenAI, createDeepSeek, createAnthropic } from "../config/deps.ts";
import { GEMINI_API_KEY, GOOGLE_MODEL, OPENAI_MODEL } from "../config/env.ts";
import { logError } from "../utils/utils.ts";

export type ProviderType = 'google' | 'openai' | 'deepseek' | 'claude'; // this is everything before Key (lowercase)

export const aiKeyNames = [
  "googleKey",
  "openAiKey",
  "deepseekKey",
  "claudeKey",
];

export interface ProviderInfo {
  provider: ProviderType;
  apiKey: string;
}

export function getAIModel(provider: ProviderType, apiKey: string, structuredOutputs = false) {
  switch (provider) {
    case 'google': {
      const googleAI = createGoogleGenerativeAI({ apiKey });
      return googleAI(GOOGLE_MODEL, { structuredOutputs });
    }
    case 'claude': {
      const anthropicAI = createAnthropic({ apiKey });
      return anthropicAI('claude-3-5-haiku-20241022');
    }
    case 'openai': {
      const openAI = createOpenAI({ apiKey });
      return openAI(OPENAI_MODEL, { structuredOutputs });
    }
    case 'deepseek': {
      const deepseek = createDeepSeek({ apiKey });
      return deepseek('deepseek-chat');
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}


export function getProviderInfoFromState(state: Record<string, any>): ProviderInfo {
  
  for (const key of aiKeyNames) {
    const value = state[key];
    if (value && typeof value === "string" && value.trim() !== "") {
      const provider = key.replace(/Key$/i, "").toLowerCase() as ProviderType;
      return { provider, apiKey: value };
    }
  }

  logError('No valid AI Provider found. Using Google default.', null);
  return { provider: 'google', apiKey: GEMINI_API_KEY as string }
}