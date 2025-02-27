import type { Context } from "../config/deps.ts";
import { NO_CACHE } from "../config/env.ts";
import { getTrendingMovies, getTrendingSeries } from "../utils/getTrending.ts";

export const handleTrendingRequest = async (ctx: Context): Promise<void> => {
  const { type, rpdbKey } = ctx.state; 

  // TODO: Need to put the users language into state so I can push data here.

  if(NO_CACHE === "true") {
    return;
  }
  
  if (!type) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Trending type is required." };
    return;
  }

  const trendingHandlers: Record<string, () => Promise<unknown>> = {
    movie: () => getTrendingMovies(rpdbKey),
    series: () => getTrendingSeries(rpdbKey),
  };

  const getTrending = trendingHandlers[type];

  if (!getTrending) {
    ctx.response.status = 400;
    ctx.response.body = { error: `Invalid trending type: ${type}` };
    return;
  }

  try {
    const trendingResponse: any = await getTrending();
    ctx.response.headers.set("Cache-Control", "public, max-age=3600");
    ctx.response.body = trendingResponse;
  } catch (error) {
    console.error("Error handling trending request:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: `Failed to fetch trending ${type}` };
  }
};
