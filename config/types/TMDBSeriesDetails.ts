export interface TMDBSeriesDetails {
    adult: boolean;
    backdrop_path: string | null;
    created_by: TMDBCreator[];
    episode_run_time: number[];
    first_air_date: string;
    genres: TMDBGenre[];
    homepage: string;
    id: number;
    in_production: boolean;
    languages: string[];
    last_air_date: string;
    last_episode_to_air: TMDBEpisode | null;
    name: string;
    next_episode_to_air: TMDBEpisode | null;
    networks: TMDBNetwork[];
    number_of_episodes: number;
    number_of_seasons: number;
    origin_country: string[];
    original_language: string;
    original_name: string;
    overview: string;
    popularity: number;
    poster_path: string | null;
    production_companies: TMDBCompany[];
    production_countries: TMDBCountry[];
    seasons: TMDBSeason[];
    spoken_languages: TMDBLanguage[];
    status: string;
    tagline: string;
    type: string;
    vote_average: number;
    vote_count: number;
    external_ids: TMDBExternalIds;
    videos: { results: TMDBVideo[] };
  }
  
  export interface TMDBCreator {
    id: number;
    credit_id: string;
    name: string;
    original_name: string;
    gender: number;
    profile_path: string | null;
  }
  
  export interface TMDBGenre {
    id: number;
    name: string;
  }
  
  export interface TMDBEpisode {
    id: number;
    name: string;
    overview: string;
    vote_average: number;
    vote_count: number;
    air_date: string;
    episode_number: number;
    episode_type: string;
    production_code: string;
    runtime: number;
    season_number: number;
    show_id: number;
    still_path: string | null;
  }
  
  export interface TMDBNetwork {
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }
  
  export interface TMDBCompany {
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }
  
  export interface TMDBCountry {
    iso_3166_1: string;
    name: string;
  }
  
  export interface TMDBSeason {
    air_date: string;
    episode_count: number;
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
    vote_average: number;
  }
  
  export interface TMDBLanguage {
    iso_639_1: string;
    name: string;
  }
  
  export interface TMDBExternalIds {
    imdb_id: string | null;
    freebase_mid: string | null;
    freebase_id: string | null;
    tvdb_id: number | null;
    tvrage_id: number | null;
    wikidata_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  }
  
  export interface TMDBVideo {
    id: string;
    iso_639_1: string;
    iso_3166_1: string;
    key: string;
    name: string;
    site: string;
    size: number;
    type: string;
    official: boolean;
    published_at: string;
  }
  