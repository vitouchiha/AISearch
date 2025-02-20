import { Meta, TMDBDetails } from "../config/types/types.ts";

export function buildMeta(
  tmdbData: TMDBDetails,
  type: string,
): Meta | null {
  if (!tmdbData.poster) return null;
  return {
    id: tmdbData.id,
    type: type,
    name: tmdbData.showName,
    poster: tmdbData.poster,
    posterShape: "poster",
  };
}
