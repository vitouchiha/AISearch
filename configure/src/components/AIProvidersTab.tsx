import React from 'react';
import { Bot } from 'lucide-react';
import { ProviderInput } from './ProviderInput.tsx';

export interface APIConfig {
  provider: string;
  apiKey: string;
  apiKeyUrl: string;
  icon: JSX.Element;
  description: string;
  model?: string;
  customModel?: string;
}

interface AIProvidersTabProps {
  aiProviders: APIConfig[];
  selectedProvider: string | null;
  setSelectedProvider: (provider: string) => void;
  updateFeatherlessConfig: (
    field: 'model' | 'customModel' | 'apiKey',
    value: string
  ) => void;
  updateApiKey: (provider: string, apiKey: string) => void;
}

export const AIProvidersTab: React.FC<AIProvidersTabProps> = ({
  aiProviders,
  selectedProvider,
  setSelectedProvider,
  updateFeatherlessConfig,
  updateApiKey,
}) => {
  const featherless = aiProviders.find((p) => p.provider === 'Featherless');

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 pb-4 border-b border-gray-800">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Bot className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            AI Provider Configuration
          </h2>
          <p className="text-sm text-gray-400">
            Select and configure your preferred AI provider. <span className="font-bold">If none are configured, the default Gemini will be used.</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {aiProviders.map((provider) => (
          <button
            type="button"
            key={provider.provider}
            onClick={() => setSelectedProvider(provider.provider)}
            className={`p-4 rounded-xl border transition-all ${selectedProvider === provider.provider
              ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
              : 'border-gray-800 hover:border-gray-700 hover:bg-white/5'
              }`}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className={`${selectedProvider === provider.provider
                  ? 'text-purple-400'
                  : 'text-gray-400'
                  }`}
              >
                {provider.icon}
              </div>
              <div>
                <div className="font-medium">{provider.provider}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {provider.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedProvider && (
        <div className="mt-6 space-y-4 animate-fadeIn">
          {selectedProvider === 'Featherless' && featherless && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Model
                </label>
                <select
                  value={featherless.model || ''}
                  onChange={(e) =>
                    updateFeatherlessConfig('model', e.target.value)
                  }
                  className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-white"
                >
                  <option value="meta-llama/Meta-Llama-3.1-8B-Instruct">
                    meta-llama/Meta-Llama-3.1-8B-Instruct
                  </option>
                  <option value="mistralai/Mistral-7B-Instruct-v0.2">
                    mistralai/Mistral-7B-Instruct-v0.2
                  </option>
                  <option value="EVA-UNIT-01/EVA-Qwen2.5-32B-v0.2">
                    EVA-UNIT-01/EVA-Qwen2.5-32B-v0.2
                  </option>
                  <option value="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B">
                    deepseek-ai/DeepSeek-R1-Distill-Qwen-32B
                  </option>
                  <option value="Qwen/Qwen2.5-7B-Instruct">
                    Qwen/Qwen2.5-7B-Instruct
                  </option>
                  <option value="Sao10K/L3.3-70B-Euryale-v2.3">
                    Sao10K/L3.3-70B-Euryale-v2.3
                  </option>
                  <option value="custom">
                    Other (Enter custom model below)
                  </option>
                </select>
              </div>

              {featherless.model === 'custom' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Custom Model Name
                  </label>
                  <input
                    type="text"
                    value={featherless.customModel || ''}
                    onChange={(e) =>
                      updateFeatherlessConfig('customModel', e.target.value)
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                    placeholder="Enter custom model name"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {selectedProvider} API Key {`     `} <a href={aiProviders.find((p) => p.provider === selectedProvider)?.apiKeyUrl || ''} target='_blank' className="text-purple-500 hover:text-purple-600 hover:text-underline ml-3">Get API Key Here</a>
            </label>
            <ProviderInput
              provider={selectedProvider}
              apiKey={
                aiProviders.find((p) => p.provider === selectedProvider)?.apiKey || ""
              }
              onChange={(newKey) => updateApiKey(selectedProvider, newKey)}
            />
          </div>
        </div>
      )}
    </div>
  );
};