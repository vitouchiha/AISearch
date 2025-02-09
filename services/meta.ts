import { Recommendation, TMDBDetails, Meta } from "../config/types.ts";

export function buildMeta(movie: Recommendation, tmdbData: TMDBDetails): Meta | null {
    if (!tmdbData.poster) return null;
    return {
      id: movie.imdb_id,
      type: "movie",
      title: tmdbData.showName || movie.title,
      poster: tmdbData.poster, 
      posterShape: "poster",
    };
  }
