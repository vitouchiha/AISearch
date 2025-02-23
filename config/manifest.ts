import type { Manifest } from "./types/manifest.ts";
import { NO_CACHE, ROOT_URL } from "./env.ts";

function getTrendingCatalogs(getTrending: boolean) {
  if (NO_CACHE !== "true" && getTrending) {
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
  if (NO_CACHE !== "true" && getTrakt) {
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

function getBehaviorHints(userId: boolean) {
  return !userId ? { behaviorHints: { configurable: true } } : {};
}

export function createManifest(trending: boolean = true, trakt: boolean = false, userId: boolean = false): Manifest {
  return {
    ...getBehaviorHints(userId),
    id: "org.ai-search",
    version: "1.4.0",
    logo: ROOT_URL + "/images/logo.webp",
    background: ROOT_URL + "/images/background.webp",
    name: "AISearch",
    description:
      "Find movies and TV using natural language queries powered by AI. Currently supports OpenAI, Gemini, and DeepSeek!",
    resources: ["catalog"],
    types: ["movie", "series"],
    catalogs: [
      {
        id: "ai-movies",
        name: "AI Movie Recommendations",
        type: "movie",
        extra: [{ name: "search", isRequired: true }],
      },
      {
        id: "ai-tv",
        name: "AI TV Recommendations",
        type: "series",
        extra: [{ name: "search", isRequired: true }],
      },
      ...(NO_CACHE !== "true"
        ? [
            ...getTrendingCatalogs(trending),
            ...getTraktCatalogs(trakt),
          ]
        : []),
    ],
  };
}