import { RouterContext } from "../deps.ts";

export interface TMDBDetails {
  id: string;
  poster: string | null;
  year: string | null;
  showName: string | null;
}

export interface Recommendation {
  title: string;
  year: number;
  imdb_id: string;
  reason: string;
}

export interface Meta {
  id: string;
  name: string | null;
  type: "movie" | "series";
  poster: string | null;
  posterShape: string;
}

export interface AppContext<
  P extends Record<string, string> = Record<string, string>,
> extends RouterContext<string, P> {
  state: {
    searchQuery?: string;
    type?: "movie" | "series";
    keys?: string;
    googleKey?: string;
    rpdbKey?: string;
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
  keys: string;
};

export type CatalogContext = AppContext<MovieCatalogParams>;
export type TrendingContext = AppContext<TrendingParams>;
export type ManifestContext = AppContext<ManifestParams>;
export type ConfigureContext = AppContext;
