import type { Manifest } from "./types/manifest.ts";

export const manifest = {
  behaviorHints: {
    configurable: true,
  },
  id: "org.ai-search",
  version: "1.2.1",
  name: "AISearch",
  description: "Find movies and TV using natural language queries powered by Google Gemini",
  resources: ["catalog"],
  types: ["movie","series"],
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
    {
      id: "ai-trending-movies",
      name: "AI Trending Movies",
      type: "movie",
    },
    {
      id: "ai-trending-tv",
      name: "AI Trending TV Shows",
      type: "series",
    }
  ],
} as Manifest;