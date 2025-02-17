import { load } from "jsr:@std/dotenv";
import { log, logError } from "../utils/utils.ts";

const DEV_MODE = Deno.env.get("DEV_MODE");

if (DEV_MODE === "true") {
  await load({ export: true });
  log("Development mode: .env file loaded.");
}

const geminiKey = Deno.env.get("GEMINI_API_KEY");
const tmdbKey = Deno.env.get("TMDB_API_KEY");
const upstashRedisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
const upstashRedisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
const upstashVectorUrl = Deno.env.get("UPSTASH_VECTOR_REST_URL");
const upstashVectorToken = Deno.env.get("UPSTASH_VECTOR_REST_TOKEN");
const aiModel = Deno.env.get("AI_MODEL");
const RPDB_FREE_API_KEY = Deno.env.get("RPDB_FREE_API_KEY")!;

const SEARCH_COUNT_STR = Deno.env.get("SEARCH_COUNT") || "20";
const SEARCH_COUNT = parseInt(SEARCH_COUNT_STR, 10);

const portStr = Deno.env.get("PORT") || "3000";
const PORT = parseInt(portStr, 10);
const ROOT_URL = Deno.env.get("ROOT_URL") || `http://localhost:${PORT}`;

if (
  !geminiKey ||
  !tmdbKey ||
  !upstashRedisUrl ||
  !upstashRedisToken ||
  !upstashVectorUrl ||
  !upstashVectorToken ||
  !aiModel
) {
  logError(
    "Missing API keys or configuration: Ensure GEMINI_API_KEY, TMDB_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, UPSTASH_VECTOR_REST_URL, UPSTASH_VECTOR_REST_TOKEN, and AI_MODEL are set in the environment. If in dev, use DEV_MODE",
  null);
  throw new Error("Missing envs");
}

const GEMINI_API_KEY: string = geminiKey;
const TMDB_API_KEY: string = tmdbKey;
const UPSTASH_REDIS_URL: string = upstashRedisUrl;
const UPSTASH_REDIS_TOKEN: string = upstashRedisToken;
const UPSTASH_VECTOR_URL: string = upstashVectorUrl;
const UPSTASH_VECTOR_TOKEN: string = upstashVectorToken;
const AI_MODEL: string = aiModel;

export {
  ROOT_URL,
  AI_MODEL,
  DEV_MODE,
  GEMINI_API_KEY,
  PORT,
  RPDB_FREE_API_KEY,
  SEARCH_COUNT,
  TMDB_API_KEY,
  UPSTASH_REDIS_TOKEN,
  UPSTASH_REDIS_URL,
  UPSTASH_VECTOR_TOKEN,
  UPSTASH_VECTOR_URL,
};
