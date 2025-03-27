import React, { lazy, Suspense, useState, useCallback } from 'react';
import { toast } from "sonner";

import { Header } from './components/Header.tsx';
import { Sidebar, type Tab } from './components/Sidebar.tsx';
import { AIProvidersTab, type APIConfig } from './components/AIProvidersTab.tsx';

import { useConfig } from './hooks/useConfig.ts';
import { useInitializeAuth } from './hooks/useInitialAuth.ts';
import { useSaveKeys, SaveKeysPayload, Config } from './hooks/useSaveKeys.ts';
import { getDefaultLanguage } from './lib/getDefaultLanguage.ts';
import { getUserIdFromUrl } from './lib/getUserIdFromUrl.ts';
import WelcomeDialog from './components/WelcomeDialog.tsx';
import { StatsCard } from './components/StatsCard.tsx';
import SocialLinks from './components/SocialLinks.tsx';

const APIKeysTab = lazy(() => import('./components/APIKeysTab.tsx'));
const TraktOAuthTab = lazy(() => import('./components/TraktOauthTab.tsx'));
const ManifestBox = lazy(() => import('./components/ManifestBox.tsx'));
const AdditionalCatalogs = lazy(() => import('./components/AdditionalCatalogs.tsx'));

interface Tmdb {
  key: string;
  language: string;
}

interface Catalogs {
  trending: boolean;
}

interface Trakt {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  createLists?: boolean;
  catalogs?: boolean;
  hasTrakt?: boolean;
}

const App: React.FC = () => {

  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [aiProviders, setAiProviders] = useState<APIConfig[]>([
    {
      provider: 'OpenAI',
      apiKey: '',
      icon: (
        <img src="/images/icons/OpenAI.svg" alt="OpenAI AI" className="w-16 h-16" />
      ),
      description: '',
      apiKeyUrl: 'https://platform.openai.com/settings/organization/api-keys',
    },
    {
      provider: 'Gemini',
      apiKey: '',
      icon: (
        <img src="/images/icons/Gemini.svg" alt="Gemini AI" className="w-16 h-16" />
      ),
      description: '',
      apiKeyUrl: 'https://aistudio.google.com/apikey',
    },
    {
      provider: 'DeepSeek',
      apiKey: '',
      icon: (
        <img src="/images/icons/DeepSeek.svg" alt="DeepSeek AI" className="w-16 h-16" />
      ),
      description: '',
      apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    },
    {
      provider: 'Claude',
      apiKey: '',
      icon: (
        <img src="/images/icons/Claude.svg" alt="Claude AI" className="w-16 h-16" />
      ),
      description: '',
      apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
      provider: 'Featherless',
      apiKey: '',
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
      icon: (
        <img src="/images/icons/Featherless.webp" alt="Featherless AI" className="w-16 h-16" />
      ),
      description: '',
      apiKeyUrl: 'https://featherless.ai/register?referrer=UEZXGWZF',
    },
  ]);

  const [tmdb, setTmdb] = useState<Tmdb>({ key: '', language: getDefaultLanguage() });
  const [catalogs, setCatalogs] = useState<Catalogs>({ trending: false });
  const [ratingPosterKey, setRatingPosterKey] = useState<string>('');
  const [omdbKey, setOmdbKey] = useState<string>('');
  const [trakt, setTrakt] = useState<Trakt>({
    access_token: '',
    refresh_token: '',
    expires_at: '',
    createLists: false,
    catalogs: false,
    hasTrakt: false,
  });
  const [userId, setUserId] = useState<string>(() => getUserIdFromUrl());

  const { config, loading, error: configError } = useConfig();

  const dummyConfig: Config = { ROOT_URL: '' };
  const effectiveConfig = config || dummyConfig;

  useInitializeAuth();

  const { mutate: saveKeys, isPending } = useSaveKeys(
    effectiveConfig,
    {
      onSuccess: (data) => {
        toast.success('Keys saved successfully!');
        setUserId(data.userId);
      },
      onError: () => {
        toast.error('Error saving keys. Please try again.');
      },
    }
  );

  const handleSave = useCallback(() => {
    if (!config) {
      toast.error('Config not loaded.');
      return;
    }
    const selectedAI = aiProviders.find((p) => p.provider === selectedProvider);
    const payload: SaveKeysPayload = {
      userId,
      recaptchaToken: undefined,
      omdbKey,
      openaiKey: selectedProvider === "OpenAI" ? selectedAI?.apiKey || '' : '',
      googleKey: selectedProvider === "Gemini" ? selectedAI?.apiKey || '' : '',
      claudeKey: selectedProvider === "Claude" ? selectedAI?.apiKey || '' : '',
      deepseekKey: selectedProvider === "DeepSeek" ? selectedAI?.apiKey || '' : '',
      featherlessKey: selectedProvider === "Featherless" ? selectedAI?.apiKey || '' : '',
      tmdbKey: tmdb.key,
      tmdbLanguage: tmdb.language,
      rpdbKey: ratingPosterKey,
      traktKey: trakt.access_token,
      traktRefresh: trakt.refresh_token,
      traktExpiresAt: trakt.expires_at,
      traktCreateLists: !!trakt.createLists,
      trendingCatalogs: !!catalogs.trending,
      traktCatalogs: !!trakt.catalogs,
      featherlessModel: selectedProvider === "Featherless" ? selectedAI?.model || '' : '',
    };

    saveKeys(payload);

  }, [
    aiProviders,
    catalogs.trending,
    config,
    omdbKey,
    ratingPosterKey,
    selectedProvider,
    tmdb,
    trakt,
    userId,
    saveKeys,
  ]);

  const updateApiKey = useCallback((provider: string, apiKey: string) => {
    console.log("Saving API key for", provider, ":", apiKey);
    setAiProviders((providers) =>
      providers.map((p) =>
        p.provider === provider ? { ...p, apiKey } : p
      )
    );
  }, []);

  const updateFeatherlessConfig = useCallback(
    (field: 'model' | 'customModel' | 'apiKey', value: string) => {
      setAiProviders((providers) =>
        providers.map((p) =>
          p.provider === 'Featherless' ? { ...p, [field]: value } : p
        )
      );
    },
    []
  );

  return (
    <div className="bg-cover bg-center bg-[url('/images/background.webp')] h-screen w-full text-gray-100 flex flex-col">
      <WelcomeDialog />
      {(loading || !config) && (
        <div className="container mx-auto px-4 py-8">
          {loading && <div>Loading...</div>}
          {!loading && !config && <div>Config not found</div>}
          {configError && <div>Error: {configError.message}</div>}
        </div>
      )}
      {(!loading && config) && (
        <>
          <Header onSave={handleSave} isSaving={isPending} />
          <div className="container mx-auto px-4 py-8 flex-1">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-64 flex-shrink-0">
                  <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                  <StatsCard />
                </div>
                <div className="flex-1">
                  <div className="bg-black/98 border border-gray-800 rounded-xl p-6">
                    <Suspense fallback={<div className="text-center">Loading...</div>}>
                      {activeTab === 'ai' && (
                        <AIProvidersTab
                          aiProviders={aiProviders}
                          selectedProvider={selectedProvider}
                          setSelectedProvider={setSelectedProvider}
                          updateFeatherlessConfig={updateFeatherlessConfig}
                          updateApiKey={updateApiKey}
                        />
                      )}
                      {activeTab === 'apis' && (
                        <APIKeysTab
                          tmdb={tmdb}
                          setTmdb={setTmdb}
                          ratingPosterKey={ratingPosterKey}
                          setRatingPosterKey={setRatingPosterKey}
                          omdbKey={omdbKey}
                          setOmdbKey={setOmdbKey}
                        />
                      )}
                      {activeTab === 'trakt' && (
                        <TraktOAuthTab setTrakt={setTrakt} trakt={trakt} />
                      )}
                      {activeTab === 'extra-catalogs' && (
                        <AdditionalCatalogs setCatalogs={setCatalogs} catalogs={catalogs} />
                      )}
                    </Suspense>
                  </div>
                  <Suspense fallback={<div className="text-center">Generating Manifest...</div>}>
                    {userId && <ManifestBox userId={userId} />}
                  </Suspense>
                  <SocialLinks />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;