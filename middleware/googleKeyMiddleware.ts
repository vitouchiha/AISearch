import { Keys } from "../config/types/types.ts";
import { Context } from "../config/deps.ts";
import { isValidGeminiApiKey } from "../utils/isValidGeminiApiKey.ts";
import { GEMINI_API_KEY, OMDB_API_KEY, TMDB_API_KEY } from "../config/env.ts";
import { decodeUrlSafeBase64 } from "../utils/urlSafe.ts";
import { encryptKeys, decryptKeys } from "../utils/encryptDecrypt.ts";
import { redis } from "../config/redisCache.ts";
import { refreshTraktToken } from "../services/trakt.ts";

const DEFAULT_KEYS: Keys = {
  googleKey: String(GEMINI_API_KEY),
  openAiKey: "",
  claudeKey: "",
  deepseekKey: "",
  tmdbKey: String(TMDB_API_KEY),
  rpdbKey: "",
  traktKey: "",
  traktRefresh: "",
  traktExpiresAt: "",
  userId: "",
  omdbKey: String(OMDB_API_KEY),
  featherlessKey: "",
  featherlessModel: "",
};

function parseKeysParam(keysParam: string | undefined): Keys {
  if (!keysParam) {
    return { ...DEFAULT_KEYS };
  }

  try {
    const decodedFromUrl = decodeURIComponent(keysParam);
    const decodedBase64 = decodeUrlSafeBase64(decodedFromUrl);
    const parsed = JSON.parse(decodedBase64);

    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_KEYS };
    }

    return {
      ...DEFAULT_KEYS,
      ...parsed,
      googleKey: parsed.googleKey === "default" ? GEMINI_API_KEY : (parsed.googleKey || GEMINI_API_KEY),
      tmdbKey: parsed.tmdbKey === "default" ? TMDB_API_KEY : (parsed.tmdbKey || TMDB_API_KEY),
      omdbKey: parsed.omdbKey || OMDB_API_KEY,
    };
  } catch (_error: unknown) {
    // console.error("[parseKeysParam] Error parsing keys:", error);
    return { ...DEFAULT_KEYS };
  }
}

async function getUserKeys(userId: string): Promise<Keys> {
  try {
    const encryptedKeys = await redis?.get(`user:${userId}`) as string;
    
    if (!encryptedKeys) {
      console.error(`[keyMiddleware] No keys found for user:${userId}`);
      return { ...DEFAULT_KEYS };
    }
    
    const keys = decryptKeys(encryptedKeys) as Keys;
    if (!keys) {
      console.error("Decryption failed, using default keys.");
      return { ...DEFAULT_KEYS };
    }
    
    return {
      ...keys,
      userId
    };
  } catch (error) {
    console.error(`[keyMiddleware] Error retrieving keys for user:${userId}:`, error);
    return { ...DEFAULT_KEYS };
  }
}

async function refreshExpiredTraktToken(keys: Keys): Promise<Keys> {
  if (keys.traktExpiresAt && Date.now() > new Date(keys.traktExpiresAt).getTime()) {
    console.log(`[keyMiddleware] Refreshing expired Trakt token for user:${keys.userId}`);
    try {
      const newTokens = await refreshTraktToken(keys.traktRefresh);
      const updatedKeys = { ...keys, ...newTokens };
      
      if (keys.userId) {
        await redis?.set(`user:${keys.userId}`, encryptKeys(updatedKeys));
      }
      
      return updatedKeys;
    } catch (error) {
      console.error("[keyMiddleware] Failed to refresh Trakt token:", error);
      return keys;
    }
  }
  
  return keys;
}

export const googleKeyMiddleware = async <P extends Record<string, string | undefined>>(
  ctx: Context, 
  next: () => Promise<unknown>
) => {
  try {
    let keys: Keys;
    const pathParts = ctx.request.url.pathname.split("/");
    const isUserRequest = pathParts[1]?.startsWith("user:");
    
    if (isUserRequest) {
      const userId = pathParts[1].replace("user:", "");
      keys = await getUserKeys(userId);
      keys = await refreshExpiredTraktToken(keys);
    } else {
      keys = parseKeysParam(ctx.params.keys);
    }

    // Set final keys in context
    if(keys.googleKey === 'default') keys.googleKey = String(GEMINI_API_KEY);
  
    ctx.state.googleKey = isValidGeminiApiKey(keys.googleKey) && 
      (!keys.openAiKey || !keys.claudeKey || !keys.deepseekKey || !keys.featherlessKey || !keys.featherlessModel) ? 
      keys.googleKey : "";
    
    ctx.state.featherlessKey = keys.featherlessKey;
    ctx.state.featherlessModel = keys.featherlessModel;
    ctx.state.openAiKey = keys.openAiKey;
    ctx.state.claudeKey = keys.claudeKey;
    ctx.state.deepseekKey = keys.deepseekKey;
    ctx.state.tmdbKey = keys.tmdbKey === 'default' ? TMDB_API_KEY : keys.tmdbKey;
    ctx.state.rpdbKey = keys.rpdbKey;
    ctx.state.traktKey = keys.traktKey;
    ctx.state.userId = keys.userId;
    ctx.state.omdbKey = keys.omdbKey || String(OMDB_API_KEY);
    ctx.state.traktCreateList = keys.traktCreateList;

    await next();
  } catch (error) {
    console.error("[keyMiddleware] Unhandled error:", error);
    // Fallback to default keys
    ctx.state.googleKey = String(GEMINI_API_KEY);
    ctx.state.tmdbKey = String(TMDB_API_KEY);
    ctx.state.omdbKey = String(OMDB_API_KEY);
    await next();
  }
};