import { badWordsFilter } from "../utils/badWordsFilter.ts";
import { CatalogContext } from "../config/types.ts";

export const searchParamMiddleware = async (ctx: CatalogContext, next: () => Promise<unknown>) => {
  try {
    const searchQuery = extractSearchQuery(ctx.params.searchParam);
    if (!searchQuery) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid search parameter format." };
      return;
    }
    if (badWordsFilter(searchQuery)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Search query contains inappropriate words." };
      return;
    }
    ctx.state.searchQuery = searchQuery;
    await next();
  } catch (error) {
    console.error("Error in searchParamMiddleware:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error." };
  }
};

function extractSearchQuery(rawParam?: string): string | null {
    const match = rawParam?.match(/^search=(.+)\.json$/);
    return match ? match[1] : null;
  }