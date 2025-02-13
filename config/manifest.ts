export const manifest = {
  behaviorHints: {
    configurable: true,
  },
  id: "org.ai-search",
  version: "1.0.0",
  name: "AI Search",
  description: "Find movies and TV using natural language queries powered by Google Gemini",
  resources: ["catalog"],
  types: ["movie","series"],
  catalogs: [
    {
      id: "ai-movies",
      name: "AI Movie Recommendations",
      type: "movie",
      extra: [{ name: "search" }],
    },
    {
      id: "ai-tv",
      name: "AI TV Recommendations",
      type: "series",
      extra: [{ name: "search" }],
    },
  ],
};