import { Index, SemanticCache } from "./deps.ts";
import { UPSTASH_VECTOR_TOKEN, UPSTASH_VECTOR_URL } from "./env.ts";

export const index = new Index({
  url: UPSTASH_VECTOR_URL,
  token: UPSTASH_VECTOR_TOKEN,
});
export const semanticCache = new SemanticCache({ index, minProximity: 0.95 });
