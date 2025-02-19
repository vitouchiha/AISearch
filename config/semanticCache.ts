import { Index, SemanticCache } from "./deps.ts";
import { UPSTASH_VECTOR_TOKEN, UPSTASH_VECTOR_URL, NO_CACHE, RESET_VECTOR_CRON } from "./env.ts";
import { log, logError } from "../utils/utils.ts";

export const index = NO_CACHE === "true"
  ? null
  : new Index({
      url: UPSTASH_VECTOR_URL,
      token: UPSTASH_VECTOR_TOKEN,
    });

export const semanticCache = NO_CACHE === "true" || !index
  ? null
  : new SemanticCache({ index, minProximity: 0.95 });

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