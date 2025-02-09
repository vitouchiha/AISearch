import { semanticCache } from "../config/semanticCache.ts";
import type { Context } from "../config/deps.ts";
import { GEMINI_API_KEY } from "../config/env.ts";

import { generateMovieRecommendations } from "../services/ai.ts";

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