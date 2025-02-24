import { Meta, TMDBDetails } from "../config/types/types.ts";
import { z } from "../config/deps.ts";

export function buildMeta(
  tmdbData: TMDBDetails,
  type: "movie" | "series",
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

const MetaSchema = z.object({
  id: z.string().trim().min(1),
  poster: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
});
export const isMeta = (meta: unknown): meta is Meta => {
  return MetaSchema.safeParse(meta).success;
};