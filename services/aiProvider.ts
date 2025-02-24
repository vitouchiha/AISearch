import { createGoogleGenerativeAI, createOpenAI, createDeepSeek, createAnthropic } from "../config/deps.ts";
import { GOOGLE_MODEL, OPENAI_MODEL } from "../config/env.ts";

export type ProviderType = 'google' | 'openai' | 'deepseek' | 'claude'; // this is everything before Key (lowercase)

export const aiKeyNames = [
  "googleKey",
  "openAiKey",
  "deepseekKey",
  "claudeKey",
  // This is your state key you set in the middleware.
];

export interface ProviderInfo {
  provider: ProviderType;
  apiKey: string;
}

export function getAIModel(provider: ProviderType, apiKey: string, structuredOutputs = false) {

  // add more here, follow the pattern
  if (provider === 'google') {
    const googleAI = createGoogleGenerativeAI({ apiKey });
    return googleAI(GOOGLE_MODEL, { structuredOutputs });
  }
  else if (provider === 'claude') {
    const anthropicAI = createAnthropic({ apiKey });
    return anthropicAI('claude-3-5-haiku-20241022');
  }
  else if (provider === 'openai') {
    const openAI = createOpenAI({ apiKey });
    return openAI(OPENAI_MODEL, { structuredOutputs });
  }
  else if (provider === 'deepseek') {
    const deepseek = createDeepSeek({ apiKey });
    return deepseek('deepseek-chat');
  }

  throw new Error(`Unsupported provider: ${provider}`);
}


export function getProviderInfoFromState(state: Record<string, any>): ProviderInfo {
  for (const key of aiKeyNames) {
    const value = state[key];
    if (value && typeof value === "string" && value.trim() !== "") {
      const provider = key.replace(/Key$/i, "").toLowerCase() as ProviderType;
      return { provider, apiKey: value };
    }
  }
  throw new Error("No valid AI provider key found");
}