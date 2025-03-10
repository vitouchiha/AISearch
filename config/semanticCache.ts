import { Index, SemanticCache } from "./deps.ts";
import { UPSTASH_VECTOR_TOKEN, UPSTASH_VECTOR_URL, NO_SEMANTIC_SEARCH, RESET_VECTOR_CRON, SEMANTIC_PROXIMITY } from "./env.ts";
import { log, logError } from "../utils/utils.ts";

export const index = NO_SEMANTIC_SEARCH ? null : new Index({
  url: UPSTASH_VECTOR_URL,
  token: UPSTASH_VECTOR_TOKEN,
});

export const semanticCache = !index ? null : new SemanticCache({ index, minProximity: SEMANTIC_PROXIMITY });

// Reset the semantic cache periodically if index exists.
Deno.cron("Reset semantic cache", RESET_VECTOR_CRON, async () => {
  if (!index) {
    log("Semantic cache is disabled. Skipping reset.");
    return;
  }

  try {
    await index.reset();
    log("Semantic cache reset successfully.");
  } catch (error) {
    logError("Failed to reset semantic cache:", error);
  }
});