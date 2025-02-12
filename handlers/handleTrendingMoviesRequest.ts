import { Context } from "../config/deps.ts";
import { getTrendingMovies } from "../utils/getTrendingMovies.ts"; 

export const handleTrendingRequest = async (ctx: Context) => {
  try {
    const trendingMoviesResponse = await getTrendingMovies();
    ctx.response.body = trendingMoviesResponse; 
    ctx.response.headers.set("Cache-Control", "max-age=3600"); 
  } catch (error) {
    console.error("Error handling trending request:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to fetch trending movies" };
  }
};