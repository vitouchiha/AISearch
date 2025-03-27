import React from 'react';
import { Key, Check, XCircle, Loader2 } from 'lucide-react';
import { tmdbLanguages } from '../lib/tmdbLanguages.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.tsx';
import { Input } from '../components/ui/input.tsx';
import useKeyStatus from '../hooks/useKeyStatus.tsx';

interface APIKeysTabProps {
  tmdb: {
    key: string;
    language: string;
  };
  setTmdb: React.Dispatch<React.SetStateAction<{
    key: string;
    language: string;
  }>>;
  ratingPosterKey: string;
  setRatingPosterKey: (value: string) => void;
  omdbKey: string;
  setOmdbKey: (value: string) => void;
}

const APIKeysTab: React.FC<APIKeysTabProps> = ({
  tmdb,
  setTmdb,
  ratingPosterKey,
  setRatingPosterKey,
  omdbKey,
  setOmdbKey,
}) => {
  const tmdbKeyStatus = useKeyStatus("tmdb", tmdb.key);
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-gray-800">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Key className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">External API Configuration</h2>
          <p className="text-sm text-gray-400">
            Configure external service API keys.{" "}
            <span className="font-bold">All of these keys are optional.</span>
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* TMDB Configuration */}
        <div className="p-4 border border-gray-700 rounded-lg">
          <h3 className="text-md font-semibold text-white mb-3 inline-flex items-center">
            <img
              src="/images/icons/Tmdb.svg"
              alt="TMDB Icon"
              className="w-20 h-20 mr-2"
            />
            Configuration
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                TMDB API Key{`  `}
                <a href="https://www.themoviedb.org/settings/api" target="_blank" className="text-purple-500 hover:text-purple-600 hover:text-underline ml-3">Get API Key Here</a>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={tmdb.key}
                  onChange={(e) => setTmdb({ ...tmdb, key: e.target.value })}
                  placeholder="Enter TMDB API Key"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {tmdbKeyStatus === "valid" && (
                    <Check className="text-green-500" size={24} />
                  )}
                  {tmdbKeyStatus === "error" && (
                    <XCircle className="text-red-500" size={24} />
                  )}
                  {tmdbKeyStatus === "checking" && (
                    <Loader2 className="text-yellow-500 animate-spin" size={24} />
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                TMDB Language
              </label>
              <Select
                value={tmdb.language}
                onValueChange={(value: string) =>
                  setTmdb({ ...tmdb, language: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {tmdbLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Other API Keys */}
        <div className="p-4 border border-gray-700 rounded-lg">
          <h3 className="text-md font-semibold text-white mb-3">Other API Keys</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                OMDB Key{`  `}
                <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" className="text-purple-500 hover:text-purple-600 hover:text-underline ml-3">Get API Key Here</a>
              </label>
              <Input
                type="text"
                value={omdbKey}
                onChange={(e) => setOmdbKey(e.target.value)}
                placeholder="Enter OMDB API Key"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Rating Poster API Key{`  `}
                <a href="https://ratingposterdb.com/api-key/" target="_blank" className="text-purple-500 hover:text-purple-600 hover:text-underline ml-3">Get API Key Here</a>
              </label>
              <Input
                type="text"
                value={ratingPosterKey}
                onChange={(e) => setRatingPosterKey(e.target.value)}
                placeholder="Enter Rating Poster API Key"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default APIKeysTab;