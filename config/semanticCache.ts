import { Index, SemanticCache } from "./deps.ts";
import { UPSTASH_VECTOR_TOKEN, UPSTASH_VECTOR_URL, RESET_VECTOR_CRON, SEMANTIC_PROXIMITY } from "./env.ts";
import { log, logError } from "../utils/utils.ts";

export const index = !UPSTASH_VECTOR_URL && !UPSTASH_VECTOR_TOKEN ? null : new Index({
      url: UPSTASH_VECTOR_URL,
      token: UPSTASH_VECTOR_TOKEN,
    });

export const semanticCache = !index ? null : new SemanticCache({ index, minProximity: SEMANTIC_PROXIMITY });

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