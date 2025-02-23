export type Resource = string | ResourceObject;

export interface ResourceObject {
  name: string;
  types: string[];
  idPrefixes?: string[];
}

export interface Extra {
  name: string;
  isRequired?: boolean;
  options?: string[];
  optionsLimit?: number;
}

// Catalog definition for content catalogs
export interface Catalog {
  type: string;
  id: string;
  name: string;
  extra?: Extra[];
}

export type ConfigType = "text" | "number" | "password" | "checkbox" | "select";

export interface Config {
  key: string;
  type: ConfigType;
  default?: string;
  title?: string;
  options?: string[];
  required?: boolean;
}

export interface BehaviorHints {
  adult?: boolean;
  p2p?: boolean;
  searchable?: boolean; // I don't think this is valid.. but lets try!
  configurable?: boolean;
  configurationRequired?: boolean;
}

export interface Manifest {
  // Basic information
  id: string; // dot-separated identifier, e.g. "com.stremio.filmon"
  name: string;
  description: string;
  version: string; // semantic version, e.g. "0.0.1"

  // Filtering properties
  resources: Resource[]; // can be strings or objects with additional details
  types: string[];
  idPrefixes?: string[];

  // Content catalogs provided by the addon
  catalogs: Catalog[];

  // Optional addon catalogs (a catalog of other addon manifests)
  addonCatalogs?: Catalog[];

  // User data configuration
  config?: Config[];

  // Other metadata
  background?: string; // URL to a background image (min 1024x786)
  logo?: string; // URL to a logo icon (256x256, monochrome)
  contactEmail?: string;

  behaviorHints?: BehaviorHints;
}
