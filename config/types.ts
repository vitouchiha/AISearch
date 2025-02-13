import { RouterContext } from "./deps.ts";

export interface TMDBDetails {
    id: string | null;
    poster: string | null;
    year: number | null;
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
    title: string;
    type: string;
    poster: string | null;
    posterShape: string;
  }
  
  export interface AppContext<P extends Record<string, string> = Record<string, string>>
    extends RouterContext<string, P> {
    state: {
      searchQuery?: string;
      googleKey?: string;
    };
  }
  
  export type MovieCatalogParams = {
    googleKey?: string;
    searchParam: string;
  };
  
  export type TrendingParams = {
    googleKey?: string;
  };
  
  export type ManifestParams = {
    googleKey?: string;
  };
  
  export type CatalogContext = AppContext<MovieCatalogParams>;
  export type TrendingContext = AppContext<TrendingParams>;
  export type ManifestContext = AppContext<ManifestParams>;
  export type ConfigureContext = AppContext;