import type { Manifest } from "./types/manifest.ts";
import { ROOT_URL, DEV_MODE } from "./env.ts";
import { redis } from "./redisCache.ts";

function getTrendingCatalogs(getTrending: boolean) {
  if (redis && getTrending) {
    return [
      {
        id: "ai-trending-movies",
        name: "AI Trending Movies",
        type: "movie",
      },
      {
        id: "ai-trending-tv",
        name: "AI Trending TV Shows",
        type: "series",
      },
    ];
  }
  return [];
}

function getTraktCatalogs(getTrakt: boolean) {
  if (redis && getTrakt) {
    return [
      {
        id: "ai-trakt-recent-tv",
        name: "AI Trakt TV Recommendations",
        type: "series",
      },
      {
        id: "ai-trakt-recent-movie",
        name: "AI Trakt Movie Recommendations",
        type: "movie",
      },
    ];
  }
  return [];
}

export function createManifest(trending: boolean = true, trakt: boolean = false): Manifest {
  return {
    behaviorHints: {
      configurable: true,
    },
    id: "org.ai-search",
    version: "1.4.0",
    logo: ROOT_URL + "/images/logo.webp",
    background: ROOT_URL + "/images/background.webp",
    name: "FilmWhisper: AISearch" + (DEV_MODE ? " DEV MODE" : ""),
    description:
      "Find movies and TV using natural language queries powered by AI. Currently supports OpenAI, Gemini, Claude and DeepSeek!",
    resources: ["catalog"],
    idPrefixes: ["tt"],
    types: ["movie", "series"],
    catalogs: [
      {
        id: "ai-movies",
        name: "AI Movie Recommendations",
        type: "movie",
        extra: [{ name: "search", isRequired: true }],
        extraSupported: ["search"],
      },
      {
        id: "ai-tv",
        name: "AI TV Recommendations",
        type: "series",
        extra: [{ name: "search", isRequired: true }],
        extraSupported: ["search"],
      },
      ...(redis
        ? [
            ...getTrendingCatalogs(trending),
            ...getTraktCatalogs(trakt),
          ]
        : []),
    ],
  };
}