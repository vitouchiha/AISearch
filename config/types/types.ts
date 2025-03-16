import { RouterContext } from "../deps.ts";

export interface BackgroundTaskParams {
  type: "movie" | "series";
  movieName: string;
  lang: string;
  tmdbKey: string;
  omdbKey: string;
  redisKey: string;
}

export interface Recommendation {
  title: string;
  year: number;
  imdb_id: string;
  reason: string;
}

export interface AppContext<
  P extends Record<string, string> = Record<string, string>,
> extends RouterContext<string, P> {
  state: {
    searchQuery?: string;
    type?: "movie" | "series";
    keys?: string;
    omdbKey?: string;
    claudeKey?: string;
    googleKey?: string;
    tmdbKey?: string;
    rpdbKey?: string;
    traktKey?: string;
    userId?: string;
    openAiKey?: string;
    deepseekKey?: string;
    traktCreateList?: boolean;
    featherlessKey?: string;
    featherlessModel?: string;
    optOutTrending?: boolean;
    optOutTraktCatalogs?: boolean;
  };
}

export type MovieCatalogParams = {
  keys: string;
  searchParam: string;
};

export type TrendingParams = {
  keys: string;
  rpdbKey?: string;
  googleKey?: string;
};

export type ManifestParams = {
  keys?: string;
  trending?: string;
};

export type Keys = {
  omdbKey: string;
  googleKey: string;
  tmdbKey: string;
  rpdbKey: string;
  traktKey: string;
  traktRefresh: string;
  traktExpiresAt: string;
  openAiKey: string;
  claudeKey: string;
  deepseekKey: string;
  userId?: string;
  traktCreateList?: boolean;
  featherlessKey?: string;
  featherlessModel?: string;
  optOutTrending?: boolean;
  optOutTraktCatalogs?: boolean;
}

export type CatalogContext = AppContext<MovieCatalogParams>;
export type TrendingContext = AppContext<TrendingParams>;
export type ManifestContext = AppContext<ManifestParams>;
export type ConfigureContext = AppContext;
