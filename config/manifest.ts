import type { Manifest } from "./types/manifest.ts";
import { ROOT_URL, DEV_MODE } from "./env.ts";
import { redis } from "./redisCache.ts";
import { getTraktFavorites } from "../services/trakt.ts";
import { Catalog } from "./types/manifest.ts";

function getTrendingCatalogs(trending: boolean): Catalog[] {
  if (redis && trending) {
    return [
      {
        id: "ai-trending-movies",
        name: "AI Trending",
        type: "movie",
      },
      {
        id: "ai-trending-tv",
        name: "AI Trending",
        type: "series",
      },
    ];
  }
  return [];
}

async function getTraktCatalogs(includeTraktCatalogs: boolean, traktKey: string): Promise<Catalog[]> {
  if (redis && includeTraktCatalogs && traktKey) {
    const results = await Promise.allSettled([
      getTraktFavorites("series", traktKey, 1),
      getTraktFavorites("movie", traktKey, 1)
    ]);

    const traktFavoritesTv = results[0].status === "fulfilled" ? results[0].value : null;
    const traktFavoritesMovies = results[1].status === "fulfilled" ? results[1].value : null;

    const catalogs: Catalog[] = [];

    if (traktFavoritesTv && traktFavoritesTv.length > 0) {
      catalogs.push({
        id: "ai-trakt-favorite-tv",
        name: "AI Favorite Recommendations",
        type: "series",
      });
    }

    if (traktFavoritesMovies && traktFavoritesMovies.length > 0) {
      catalogs.push({
        id: "ai-trakt-favorite-movie",
        name: "AI Favorite Recommendations",
        type: "movie",
      });
    }

    catalogs.push(
      {
        id: "ai-trakt-recent-tv",
        name: "AI Watched Recommendations",
        type: "series",
      },
      {
        id: "ai-trakt-recent-movie",
        name: "AI Watched Recommendations",
        type: "movie",
      }
    );

    return catalogs;
  }
  return [];
}

interface CreateManifestOptions {
  trending?: boolean;
  traktCatalogs?: boolean;
  traktKey?: string;
}

export async function createManifest({
  trending = true,
  traktCatalogs = false,
  traktKey,
}: CreateManifestOptions = {}): Promise<Manifest> {
  const trendingCatalogs: Catalog[] = redis ? getTrendingCatalogs(trending) : [];
  const traktCatalogsList: Catalog[] = (redis && traktKey) ? await getTraktCatalogs(traktCatalogs, traktKey) : [];

  return {
    behaviorHints: {
      configurable: true,
    },
    id: "org.ai-search",
    version: "1.4.2",
    logo: `${ROOT_URL}/images/logo.webp`,
    background: `${ROOT_URL}/images/background.webp`,
    name: `FilmWhisper: AISearch${DEV_MODE ? " DEV MODE" : ""}`,
    description:
      "Find movies and TV using natural language queries powered by AI. Currently supports OpenAI, Gemini, Claude and DeepSeek!",
    resources: ["catalog"],
    idPrefixes: ["tt"],
    types: ["movie", "series"],
    catalogs: [
      {
        id: "ai-movies",
        name: "AI Recommendations",
        type: "movie",
        extra: [{ name: "search", isRequired: true }],
        extraSupported: ["search"],
      },
      {
        id: "ai-tv",
        name: "AI Recommendations",
        type: "series",
        extra: [{ name: "search", isRequired: true }],
        extraSupported: ["search"],
      },
      ...trendingCatalogs,
      ...traktCatalogsList,
    ],
  };
}
