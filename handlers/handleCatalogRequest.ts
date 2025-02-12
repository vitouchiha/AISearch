import { semanticCache } from "../config/semanticCache.ts";
import { redis } from "../config/redisCache.ts";
import type { Context } from "../config/deps.ts";
import { GEMINI_API_KEY } from "../config/env.ts";

import { generateMovieRecommendations } from "../services/ai.ts";

const MAX_CACHE_ENTRIES = 20;
const TRENDING_MOVIES_LIST = "trendingmovies";

export const handleCatalogRequest = async (ctx: Context, query: string, googleKey: string) => {
  try {
    const effectiveKey = googleKey || GEMINI_API_KEY;
    const searchQuery =
      query || (ctx.request.url.searchParams.get("search") ?? "");
    if (!searchQuery) {
      throw new Error("No search query provided");
    }
    console.log(`[${new Date().toISOString()}] Search query: ${searchQuery}`);

    const cachedResult = await semanticCache.get(searchQuery);
    if (cachedResult) {
      console.log(
        `[${new Date().toISOString()}] Cache hit for query: ${searchQuery}`
      );
      ctx.response.headers.set("Cache-Control", "max-age=3600");
      ctx.response.body = JSON.parse(cachedResult);
      return;
    }

    const responsePayload = await generateMovieRecommendations(searchQuery, effectiveKey);

    if(responsePayload.metas[0]){
      const firstResult = responsePayload.metas[0];    

      await redis.lpush(TRENDING_MOVIES_LIST, JSON.stringify(firstResult));
      await redis.ltrim(TRENDING_MOVIES_LIST, 0, MAX_CACHE_ENTRIES -1); 

    }

    await semanticCache.set(searchQuery, JSON.stringify(responsePayload));

    ctx.response.headers.set("Cache-Control", "max-age=3600");
    ctx.response.body = responsePayload;
  } catch (error: unknown) { 
    console.error(`[${new Date().toISOString()}] Error:`, error);

    let errorMessage = "An unknown error occurred.";

    if (error instanceof Error) { 
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = String(error.message); 
    }

    ctx.response.status = 500;
    ctx.response.body = {
      error: "Failed to generate recommendations",
      details: errorMessage,
    };
  }
};