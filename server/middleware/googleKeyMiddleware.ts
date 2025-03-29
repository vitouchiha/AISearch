import { Keys } from "../config/types/types.ts";
import { Context } from "../config/deps.ts";
import { isValidGeminiApiKey } from "../utils/isValidGeminiApiKey.ts";
import { GEMINI_API_KEY, OMDB_API_KEY, TMDB_API_KEY } from "../config/env.ts";
import { decodeUrlSafeBase64 } from "../utils/urlSafe.ts";
import { encryptKeys, decryptKeys } from "../utils/encryptDecrypt.ts";
import { redis } from "../config/redisCache.ts";
import { getEncryptedKeys, saveEncryptedKeys } from "../config/database.ts";
import { refreshTraktToken, parseTraktExpiresAt } from "../services/trakt.ts";

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
  tmdbLanguage: 'en',

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
    if (!redis) {
      console.error(`[keyMiddleware] Redis client is not initialized.`);
      // Handle the absence of Redis appropriately, e.g., fetch directly from the database
      const dbEncryptedKeys = await getEncryptedKeys(userId);
      if (!dbEncryptedKeys) {
        console.error(`[keyMiddleware] No keys found for user:${userId} in DB.`);
        return { ...DEFAULT_KEYS };
      }
      const keys = decryptKeys(dbEncryptedKeys) as Keys;
      if (!keys) {
        console.error("Decryption failed, using default keys.");
        return { ...DEFAULT_KEYS };
      }
      return {
        ...keys,
        userId,
      };
    }

    // Initialize the pipeline
    const pipeline = redis.pipeline();

    // Queue the commands
    pipeline.get(`user:${userId}`);
    pipeline.ttl(`user:${userId}`);

    // Execute the pipeline
    const redisResults = await pipeline.exec();

    // Extract results
    const encryptedKeys = redisResults[0] as string | null;
    const ttl = redisResults[1] as number | null;
    const isLegacy = ttl === -1;

    if (encryptedKeys) {
      if (isLegacy) {
        console.log(`[keyMiddleware] Legacy Redis key for user:${userId}, migrating to Postgres.`);
        await Promise.all([
          saveEncryptedKeys(userId, encryptedKeys),
          redis.expire(`user:${userId}`, 86400),
        ]);
      }

      const keys = decryptKeys(encryptedKeys) as Keys;
      if (!keys) {
        console.error("Decryption failed, using default keys.");
        return { ...DEFAULT_KEYS };
      }

      return {
        ...keys,
        userId,
      };
    }

    console.warn(`[keyMiddleware] Cache miss for user:${userId}, checking database...`);
    const dbEncryptedKeys = await getEncryptedKeys(userId);

    if (dbEncryptedKeys) {
      await redis.set(`user:${userId}`, dbEncryptedKeys, { ex: 86400 });
    } else {
      console.error(`[keyMiddleware] No keys found for user:${userId} in cache or DB.`);
      return { ...DEFAULT_KEYS };
    }

    const keys = decryptKeys(dbEncryptedKeys) as Keys;
    if (!keys) {
      console.error("Decryption failed, using default keys.");
      return { ...DEFAULT_KEYS };
    }

    return {
      ...keys,
      userId,
    };
  } catch (error) {
    console.error(`[keyMiddleware] Error retrieving keys for user:${userId}:`, error);
    return { ...DEFAULT_KEYS };
  }
}

async function refreshExpiredTraktToken(keys: Keys): Promise<Keys> {
  if(!keys.traktRefresh || !keys.traktExpiresAt){
    return keys;
  }

  const expiresAt = parseTraktExpiresAt(keys.traktExpiresAt);
  const fiveMinBuffer = 5 * 60 * 1000;

  if (!expiresAt || isNaN(expiresAt)) {
    console.warn(`[keyMiddleware] Invalid traktExpiresAt for user:${keys.userId}, skipping refresh.`);
    return keys;
  }

  if (Date.now() > expiresAt - fiveMinBuffer) {
    console.log(`[keyMiddleware] Refreshing Trakt token for user:${keys.userId}`);

    const lockKey = `lock:refresh:${keys.userId}`;
    const gotLock = await redis?.set(lockKey, "1", { nx: true, ex: 10 });

    if (!gotLock) {
      console.log(`[keyMiddleware] Token refresh in progress for user:${keys.userId}, skipping duplicate`);
      return keys;
    }

    try {
      const newTokens = await refreshTraktToken(keys.traktRefresh);
      const updatedKeys = { ...keys, ...newTokens };
      const encrypted = encryptKeys(updatedKeys);

      if (keys.userId) {
        const newExpiry = parseTraktExpiresAt(updatedKeys.traktExpiresAt);
        if (isNaN(newExpiry)) {
          throw new Error(`[refreshExpiredTraktToken] Invalid traktExpiresAt: ${updatedKeys.traktExpiresAt}`);
        }
      
        const expiresIn = Math.floor((newExpiry - Date.now()) / 1000);
        const paddedExpiry = Math.max(60, expiresIn - 60); // never less than 60s
      
        console.log(`[keyMiddleware] Trakt token refreshed for user:${keys.userId}, expires in ${expiresIn}s`);
      
        await Promise.all([
          redis?.set(`user:${keys.userId}`, encrypted, { ex: paddedExpiry }),
          saveEncryptedKeys(keys.userId, encrypted),
        ]);
      }

      return updatedKeys;
    } catch (error) {
      console.error("[keyMiddleware] Failed to refresh Trakt token:", error);
      return keys;
    } finally {
      await redis?.del(lockKey);
    }
  }

  return keys;
}

export const googleKeyMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
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
    if (keys.googleKey === 'default') keys.googleKey = String(GEMINI_API_KEY);

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

    ctx.state.traktCreateList = keys.traktCreateLists;
    ctx.state.trendingCatalogs = keys.trendingCatalogs;
    ctx.state.traktCatalogs = keys.traktCatalogs;
    ctx.state.tmdbLanguage = keys.tmdbLanguage || 'en';


    await next();
  } catch (error) {
    console.error("[keyMiddleware] Unhandled error:", error);
    // Fallback to default keys
    ctx.state.googleKey = String(GEMINI_API_KEY);
    ctx.state.tmdbKey = String(TMDB_API_KEY);
    ctx.state.omdbKey = String(OMDB_API_KEY);
    ctx.state.tmdbLanguage = "en";
    await next();
  }
};