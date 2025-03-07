import type { Context } from "../config/deps.ts";
import { NO_CACHE } from "../config/env.ts";
import { getTrendingMovies, getTrendingSeries } from "../utils/getTrending.ts";
import { parseAcceptLanguage } from "../utils/parseAcceptedLanguage.ts";

export const handleTrendingRequest = async (ctx: Context): Promise<void> => {
  const { type, rpdbKey } = ctx.state;
  const headerLang = ctx.request.headers.get("Accept-Language")!; // attempting to get language like this....
  const lang = parseAcceptLanguage(headerLang);

  if(NO_CACHE === "true") {
    return;
  }
  
  if (!type) {
    ctx.response.body = { metas: [] };
    return;
  }

  const trendingHandlers: Record<string, () => Promise<unknown>> = {
    movie: () => getTrendingMovies(rpdbKey, lang),
    series: () => getTrendingSeries(rpdbKey, lang),
  };

  const getTrending = trendingHandlers[type];

  if (!getTrending) {
    ctx.response.body = { metas: [] };
    return;
  }

  try {
    const trendingResponse: any = await getTrending();
    ctx.response.body = trendingResponse;
  } catch (error) {
    console.error("Error handling trending request:", error);
    ctx.response.body = { metas: [] };
  }
};
