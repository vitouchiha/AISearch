import { Context } from "../config/deps.ts";
import { getTrendingMovies, getTrendingSeries } from "../utils/getTrending.ts";

export const handleTrendingRequest = async (ctx: Context ) => {
  const { type } = ctx.state;
  try {
    let trendingResponse;
    if (type === "movie") {
      trendingResponse = await getTrendingMovies();
    } else if (type === "series") {
      trendingResponse = await getTrendingSeries();
    } else {
      throw new Error("Invalid type for trending");
    }
    ctx.response.body = trendingResponse; 
    ctx.response.headers.set("Cache-Control", "max-age=3600"); 
  } catch (error) {
    console.error("Error handling trending request:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: `Failed to fetch trending ${type}` };
  }
};
