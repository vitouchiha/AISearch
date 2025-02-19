import { Index, SemanticCache } from "./deps.ts";
import { UPSTASH_VECTOR_TOKEN, UPSTASH_VECTOR_URL, NO_CACHE } from "./env.ts";

export const index = NO_CACHE === "true"
  ? null
  : new Index({
      url: UPSTASH_VECTOR_URL,
      token: UPSTASH_VECTOR_TOKEN,
    });

export const semanticCache = NO_CACHE === "true" || !index
  ? null
  : new SemanticCache({ index, minProximity: 0.95 });