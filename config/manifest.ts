export const manifest = {
  behaviorHints: {
    configurable: true,
  },
  id: "org.ai-movies.movies",
  version: "1.0.0",
  name: "AI Movie Finder",
  description: "Find movies using natural language queries powered by Google Gemini",
  resources: ["catalog"],
  types: ["movie"],
  catalogs: [
    {
      id: "ai-movies",
      name: "AI Recommendations",
      type: "movie",
      extra: [{ name: "search" }],
    },
  ],
};