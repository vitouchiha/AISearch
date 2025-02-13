import { Recommendation, TMDBDetails, Meta } from "../config/types.ts";

export function buildMeta(movie: Recommendation, tmdbData: TMDBDetails, type: string): Meta | null {
    if (!tmdbData.poster) return null;
    return {
      id: movie.imdb_id,
      type: type,
      name: tmdbData.showName || movie.title,
      poster: tmdbData.poster, 
      posterShape: "poster",
    };
  }
