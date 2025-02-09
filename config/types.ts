export interface TMDBDetails {
    id: string | null;
    poster: string | null;
    year: number | null;
    showName: string | null;
  }
  
  export interface Recommendation {
    title: string;
    year: number;
    imdb_id: string;
    reason: string;
  }
  
  export interface Meta {
    id: string;
    title: string;
    type: string;
    poster: string | null;
    posterShape: string;
  }
  