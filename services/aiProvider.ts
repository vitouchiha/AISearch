import { createGoogleGenerativeAI, createOpenAI, createDeepSeek, createAnthropic, createOpenAICompatible } from "../config/deps.ts";
import { GEMINI_API_KEY, GOOGLE_MODEL, OPENAI_MODEL } from "../config/env.ts";
import { logError } from "../utils/utils.ts";

export type ProviderType = 'google' | 'openai' | 'deepseek' | 'claude' | 'featherless'; // this is everything before Key (lowercase)

export const aiKeyNames = [
  "googleKey",
  "openAiKey",
  "deepseekKey",
  "claudeKey",
  "featherlessKey"
];

const featherlessModels = [
  "meta-llama/Meta-Llama-3.1-8B-Instruct",
  "mistralai/Mistral-7B-Instruct-v0.2",
  "deepseek-ai/DeepSeek-R1",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
  "Qwen/Qwen2.5-7B-Instruct",
  "Sao10K/L3.3-70B-Euryale-v2.3"
]

export interface ProviderInfo {
  provider: ProviderType;
  model?: string;
  apiKey: string;
}

export function getAIModel(provider: ProviderType, apiKey: string, model?: string, structuredOutputs = false) {
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
    case "featherless": {
      // Only allow models from featherlessModels
      const allowedModel = model ? model : featherlessModels[0];
      const feather = createOpenAICompatible({
        name: 'featherless',
        apiKey: apiKey,
        baseURL: "https://api.featherless.ai/v1",
      });
      return feather(allowedModel, { structuredOutputs });
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
      return { provider, apiKey: value, model: state.featherlessModel };
    }
  }

  logError('No valid AI Provider found. Using Google default.', null);
  return { provider: 'google', apiKey: GEMINI_API_KEY as string }
}