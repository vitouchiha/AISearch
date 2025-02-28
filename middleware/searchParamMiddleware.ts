import { badWordsFilter } from "../utils/badWordsFilter.ts";
import { CatalogContext } from "../config/types/types.ts";
import { logError } from "../utils/utils.ts";

export const searchParamMiddleware = async (
  ctx: CatalogContext,
  next: () => Promise<unknown>,
) => {
  try {
    const searchQuery = extractSearchQuery(ctx.params.searchParam);
    if (!searchQuery) {
      ctx.response.body = { metas: [] };
      return;
    }
    if (badWordsFilter(searchQuery)) {
      ctx.response.body = { metas: [] };
      return;
    }
    ctx.state.searchQuery = searchQuery;
    await next();
  } catch (error) {
    logError("Error in searchParamMiddleware:", error);
    ctx.response.body = { metas: [] };
  }
};

function extractSearchQuery(rawParam?: string): string | null {
  const match = rawParam?.match(/^search=(.+)\.json$/);
  return match ? match[1] : null;
}
