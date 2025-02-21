import { load } from "jsr:@std/dotenv";
import { log, logError } from "../utils/utils.ts";

// Load .env file in development mode.
const DEV_MODE = Deno.env.get("DEV_MODE");
if (DEV_MODE === "true") {
  await load({ export: true });
  log("Development mode: .env file loaded.");
}

const NO_CACHE = Deno.env.get("DISABLE_CACHE") ?? "false";
if (NO_CACHE === "true") {
  log("!!! Caching disabled !!!");
}

// Load environment variables.
const geminiKey = Deno.env.get("GEMINI_API_KEY");
const tmdbKey = Deno.env.get("TMDB_API_KEY");
const upstashRedisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
const upstashRedisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
const upstashVectorUrl = Deno.env.get("UPSTASH_VECTOR_REST_URL");
const upstashVectorToken = Deno.env.get("UPSTASH_VECTOR_REST_TOKEN");
const aiModel = Deno.env.get("AI_MODEL") || "gemini-2.0-flash-lite-preview-02-05";
const RPDB_FREE_API_KEY = Deno.env.get("RPDB_FREE_API_KEY")!;

const RESET_VECTOR_CRON = Deno.env.get("RESET_VECTOR_CRON") || "0 0 1 * *";

const SEMANTIC_PROXIMITY = Number(Deno.env.get("SEMANTIC_PROXIMITY") || 0.95);
if(SEMANTIC_PROXIMITY > 1.0 || SEMANTIC_PROXIMITY < 0.0) {
  logError("SEMANTIC_PROXIMITY must be a float between 0.0 and 1.0", null);
  throw new Error("Invalid SEMANTIC_PROXIMITY");
}

const SEARCH_COUNT_STR = Deno.env.get("SEARCH_COUNT") || "20";
const SEARCH_COUNT = parseInt(SEARCH_COUNT_STR, 10);
const portStr = Deno.env.get("PORT") || "3000";
const PORT = parseInt(portStr, 10);
const ROOT_URL = Deno.env.get("ROOT_URL") || `http://localhost:${PORT}`;

if (
  !geminiKey ||
  !RPDB_FREE_API_KEY || 
  !tmdbKey ||
  !aiModel ||
  (NO_CACHE !== "true" && (!upstashRedisUrl || !upstashRedisToken || !upstashVectorUrl || !upstashVectorToken))
) {
  logError(
    "Missing API keys or configuration: Ensure GEMINI_API_KEY, TMDB_API_KEY, AI_MODEL, and (if caching is enabled) UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, UPSTASH_VECTOR_REST_URL, and UPSTASH_VECTOR_REST_TOKEN are set in the environment. If in dev, use DEV_MODE.",
    null,
  );
  throw new Error("Missing required environment variables");
}

const UPSTASH_REDIS_URL_FINAL = NO_CACHE === "true" ? "" : upstashRedisUrl!;
const UPSTASH_REDIS_TOKEN_FINAL = NO_CACHE === "true" ? "" : upstashRedisToken!;
const UPSTASH_VECTOR_URL_FINAL = NO_CACHE === "true" ? "" : upstashVectorUrl!;
const UPSTASH_VECTOR_TOKEN_FINAL = NO_CACHE === "true" ? "" : upstashVectorToken!;

export {
  ROOT_URL,
  aiModel as AI_MODEL,
  DEV_MODE,
  NO_CACHE,
  geminiKey as GEMINI_API_KEY,
  PORT,
  RPDB_FREE_API_KEY,
  SEARCH_COUNT,
  tmdbKey as TMDB_API_KEY,
  UPSTASH_REDIS_TOKEN_FINAL as UPSTASH_REDIS_TOKEN,
  UPSTASH_REDIS_URL_FINAL as UPSTASH_REDIS_URL,
  UPSTASH_VECTOR_TOKEN_FINAL as UPSTASH_VECTOR_TOKEN,
  UPSTASH_VECTOR_URL_FINAL as UPSTASH_VECTOR_URL,
  RESET_VECTOR_CRON,
  SEMANTIC_PROXIMITY
};
