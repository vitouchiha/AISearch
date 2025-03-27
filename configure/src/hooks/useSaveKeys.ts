import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import axios from 'axios';

export interface SaveKeysPayload {
  userId: string;
  recaptchaToken?: string;
  omdbKey: string;
  openaiKey: string;
  googleKey: string;
  claudeKey: string;
  deepseekKey: string;
  featherlessKey: string;
  tmdbKey: string;
  tmdbLanguage: string;
  rpdbKey: string;
  traktKey: string;
  traktRefresh: string;
  traktExpiresAt: string;
  traktCreateLists: boolean;
  trendingCatalogs: boolean;
  traktCatalogs: boolean;
  featherlessModel: string;
}

export interface Config {
  ROOT_URL: string;
  CAPTCHA_SITE_KEY?: string;
}

export const useSaveKeys = (
  config: Config,
  options?: UseMutationOptions<any, Error, SaveKeysPayload, unknown>
) => {
  return useMutation({
    mutationFn: async (payload: SaveKeysPayload) => {
      // Optionally, handle captcha here...

      const response = await axios.post(`${config.ROOT_URL}/api/store-keys`, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });
      return response.data;
    },
    ...options,
  });
};