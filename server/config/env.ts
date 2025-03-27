import { load } from "jsr:@std/dotenv";
import { log, logError } from "../utils/utils.ts";
import { Buffer } from "./deps.ts";
import { getNgrokUrl } from "../utils/getNgrokUrl.ts";

// Load .env file in development mode.
const DEV_MODE = Deno.env.get("DEV_MODE");
if (DEV_MODE === "true") {
  await load({ export: true });
  log("Development mode: .env file loaded.");
}

// Load environment variables.

const secret = Deno.env.get("JWT_SECRET");
let JWT_SECRET: CryptoKey;
if (secret && secret.length !== 0) {
  JWT_SECRET = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

const IS_PROD = !DEV_MODE;

const CORS_ALLOWED_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS");

const GOOGLE_MODEL = Deno.env.get("GOOGLE_MODEL") || 'gemini-2.0-flash-lite'; // lite is fastest and cheapest. Good for this large scale.
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || 'gpt-4o-mini';
const OMDB_API_KEY = Deno.env.get("OMDB_API_KEY");
const CAPTCHA_SITE_KEY = Deno.env.get("CAPTCHA_SITE_KEY");
const CAPTCHA_SECRET_KEY = Deno.env.get("CAPTCHA_SECRET_KEY");
const ENABLE_CAPTCHA = Boolean(CAPTCHA_SITE_KEY && CAPTCHA_SECRET_KEY);


const QSTASH_URL = Deno.env.get("QSTASH_URL");
const QSTASH_TOKEN = Deno.env.get("QSTASH_TOKEN");

const QSTASH_CURRENT_SIGNING_KEY = Deno.env.get("QSTASH_CURRENT_SIGNING_KEY");
const QSTASH_NEXT_SIGNING_KEY = Deno.env.get("QSTASH_NEXT_SIGNING_KEY");
const QSTASH_SECRET = Deno.env.get("QSTASH_SECRET");

const geminiKey = Deno.env.get("GEMINI_API_KEY");
const tmdbKey = Deno.env.get("TMDB_API_KEY");

const upstashRedisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
const upstashRedisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const upstashVectorUrl = Deno.env.get("UPSTASH_VECTOR_REST_URL");
const upstashVectorToken = Deno.env.get("UPSTASH_VECTOR_REST_TOKEN");
const disableSemanticEnv = Deno.env.get("DISABLE_SEMANTIC_SEARCH") === 'true';
const NO_SEMANTIC_SEARCH = disableSemanticEnv || !(upstashVectorUrl && upstashVectorToken);

const RESET_VECTOR_CRON = Deno.env.get("RESET_VECTOR_CRON") || "0 0 1 * *";

const SEMANTIC_PROXIMITY = Number(Deno.env.get("SEMANTIC_PROXIMITY") || 0.95);
if (SEMANTIC_PROXIMITY > 1.0 || SEMANTIC_PROXIMITY < 0.0) {
  logError("SEMANTIC_PROXIMITY must be a float between 0.0 and 1.0", null);
  throw new Error("Invalid SEMANTIC_PROXIMITY");
}

const RPDB_FREE_API_KEY = Deno.env.get("RPDB_FREE_API_KEY")!;

const SEARCH_COUNT_STR = Deno.env.get("SEARCH_COUNT") || "20";
const SEARCH_COUNT = parseInt(SEARCH_COUNT_STR, 10);

const portStr = Deno.env.get("PORT") || "3000";
const PORT = parseInt(portStr, 10);

const ROOT_URL = Deno.env.get("ROOT_URL") || `http://localhost:${PORT}`;

const TRAKT_CLIENT_ID = Deno.env.get("TRAKT_CLIENT_ID");
const TRAKT_CLIENT_SECRET = Deno.env.get("TRAKT_CLIENT_SECRET");

const NGROK_TOKEN = Deno.env.get("NGROK_TOKEN");
const hasNgrokToken = NGROK_TOKEN !== undefined && NGROK_TOKEN !== "";
const NGROK_URL = !hasNgrokToken ? undefined : await getNgrokUrl();

const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
if (!ENCRYPTION_KEY) throw new Error('Encryption key must be set!');
const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");
if (keyBuffer.length !== 32) {
  throw new Error(`Invalid ENCRYPTION_KEY length: ${keyBuffer.length} bytes, expected 32 bytes for AES-256. Must be a 64-char hex string.`);
}

const GCP_BILLING_ACCOUNT_ID = Deno.env.get("GCP_BILLING_ACCOUNT_ID");

if (
  !geminiKey ||
  !OMDB_API_KEY ||
  !RPDB_FREE_API_KEY ||
  !TRAKT_CLIENT_ID ||
  !TRAKT_CLIENT_SECRET ||
  !upstashRedisToken ||
  !upstashRedisUrl ||
  !tmdbKey
) {
  logError(
    "Missing API keys or configuration: Ensure GEMINI_API_KEY, TRAKT_API_KEY, TRAKT_CLIENT_SECRET, TMDB_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, are set in the environment. If in dev, use DEV_MODE.",
    null,
  );
  throw new Error("Missing required environment variables");
}

export {
  ROOT_URL,
  IS_PROD,
  CORS_ALLOWED_ORIGINS,
  JWT_SECRET,
  ENCRYPTION_KEY,
  DEV_MODE,
  NO_SEMANTIC_SEARCH,
  TRAKT_CLIENT_ID,
  TRAKT_CLIENT_SECRET,
  ENABLE_CAPTCHA,
  CAPTCHA_SITE_KEY,
  CAPTCHA_SECRET_KEY,
  geminiKey as GEMINI_API_KEY,
  PORT,
  RPDB_FREE_API_KEY,
  OMDB_API_KEY,
  SEARCH_COUNT,
  tmdbKey as TMDB_API_KEY,
  upstashRedisToken as UPSTASH_REDIS_TOKEN,
  upstashRedisUrl as UPSTASH_REDIS_URL,
  upstashVectorToken as UPSTASH_VECTOR_TOKEN,
  upstashVectorUrl as UPSTASH_VECTOR_URL,
  QSTASH_URL,
  QSTASH_TOKEN,
  QSTASH_SECRET,
  QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY,
  NGROK_URL,
  NGROK_TOKEN,
  RESET_VECTOR_CRON,
  SEMANTIC_PROXIMITY,

  GOOGLE_MODEL,
  OPENAI_MODEL,
  GCP_BILLING_ACCOUNT_ID,
};
