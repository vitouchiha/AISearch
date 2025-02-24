// Behavior hints for Meta objects
export interface BehaviorHints {
    defaultVideoId?: string;
}

// Trailer object, note the union for allowed types.
export interface Trailer {
    source: string;
    type: "Trailer" | "Clip";
}

// Meta Link object for linking related content
export interface MetaLink {
    name: string;
    category: string;
    url: string;
}

// Stream object for video playback (expand as needed)
export interface Stream {
    // You could extend this with properties like "url", "protocol", etc.
    // For now, we keep it minimal as a placeholder.
    source: string;
    type: string;
}

// Video object for individual videos/episodes
export interface Video {
    id: string;
    title: string;
    // ISO 8601 string is used for the release date
    released: string;
    thumbnail?: string;
    streams?: Stream[];
    available?: boolean;
    episode?: number;
    season?: number;
    trailers?: Trailer[];
    overview?: string;
}

// Main Meta object for detailed content descriptions
export interface Meta {
    id: string;
    type: string;
    name: string;
    genres?: string[];
    poster?: string | null;
    // Using a union type for posterShape to restrict the allowed values
    posterShape?: "square" | "poster" | "landscape";
    background?: string;
    logo?: string;
    description?: string;
    releaseInfo?: string;
    director?: string[];
    cast?: string[];
    imdbRating?: string;
    released?: string;
    trailers?: Trailer[];
    links?: MetaLink[];
    videos?: Video[];
    runtime?: string;
    language?: string;
    country?: string;
    awards?: string;
    website?: string;
    behaviorHints?: BehaviorHints;
}

// Meta Preview object for catalog responses
export interface MetaPreview {
    id: string;
    type: string;
    name: string;
    // Poster is required in preview objects.
    poster: string;
    posterShape?: "square" | "poster" | "landscape";
    genres?: string[];
    imdbRating?: string;
    releaseInfo?: string;
    director?: string[];
    cast?: string[];
    links?: MetaLink[];
    description?: string;
    trailers?: Trailer[];
}
