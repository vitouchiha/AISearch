import { AppContext, Keys } from "../config/types/types.ts";
import { isValidGeminiApiKey } from "../utils/isValidGeminiApiKey.ts";
import { GEMINI_API_KEY, OMDB_API_KEY, TMDB_API_KEY } from "../config/env.ts";
import { decodeUrlSafeBase64 } from "../utils/urlSafe.ts";
import { encryptKeys, decryptKeys } from "../utils/encryptDecrypt.ts";
import { redis } from "../config/redisCache.ts";
import { refreshTraktToken } from "../services/trakt.ts";

// Parse old-style keysParam
function parseKeysParam(keysParam: string | undefined): Keys {
  const defaultKeys: Keys = {
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
  };

  if (!keysParam) {
    return defaultKeys;
  }

  try {
    const decodedFromUrl = decodeURIComponent(keysParam);
    const decodedBase64 = decodeUrlSafeBase64(decodedFromUrl);
    const parsed = JSON.parse(decodedBase64);

    if (typeof parsed !== "object" || parsed === null) {
      return defaultKeys;
    }

    let googleKey = parsed.googleKey || GEMINI_API_KEY;
    const openAiKey = parsed.openAiKey;
    const claudeKey = parsed.claudeKey;
    const deepseekKey = parsed.deepseekKey;
    let tmdbKey = parsed.tmdbKey || TMDB_API_KEY;
    const omdbKey = parsed.omdbKey || OMDB_API_KEY;
    const rpdbKey = parsed.rpdbKey || "";
    const traktKey = parsed.traktKey || "";
    const traktRefresh = parsed.traktRefresh || "";
    const traktExpiresAt = parsed.traktExpiresAt || "";

    if (googleKey === "default") googleKey = GEMINI_API_KEY;
    if (tmdbKey === "default") tmdbKey = TMDB_API_KEY;

    return { omdbKey, googleKey, claudeKey, openAiKey, deepseekKey, tmdbKey, rpdbKey, traktKey, traktRefresh, traktExpiresAt };
  } catch (error: unknown) {
    //console.error("[parseKeysParam] Error parsing keys:", error);
    return defaultKeys;
  }
}


export const googleKeyMiddleware = async <
  P extends Record<string, string | undefined>,
>(ctx: AppContext<P>, next: () => Promise<unknown>) => {

  try {
    let keys: Keys;
    const pathParts = ctx.request.url.pathname.split("/");

    if (pathParts[1]?.startsWith("user:")) {
      const userId: string = pathParts[1].replace("user:", "");
      const encryptedKeys = await redis?.get(`user:${userId}`) as string;

      if (!encryptedKeys) {
        console.error(`[googleKeyMiddleware] No keys found for user:${userId}`);
        console.error(`[googleKeyMiddleware] Using Default keys`);
        keys = parseKeysParam(undefined);
        ctx.state.googleKey = keys.googleKey;
        ctx.state.tmdbKey = keys.tmdbKey;
        ctx.state.omdbKey = keys.omdbKey;
        await next();
        return;
      }

      keys = decryptKeys(encryptedKeys) as Keys;

      keys.userId = userId || '';

      if (keys.traktExpiresAt && Date.now() > new Date(keys.traktExpiresAt).getTime()) {
        console.log(`[googleKeyMiddleware] Refreshing expired Trakt token for user:${userId}`);
        const newKeys = await refreshTraktToken(keys.traktRefresh);
        keys = { ...keys, ...newKeys };
        await redis?.set(`user:${userId}`, encryptKeys(keys));
      }
    } else {
      const keysParam = ctx.params.keys;
      keys = parseKeysParam(keysParam);
    }

    let finalGoogleKey: string;
    if (isValidGeminiApiKey(keys.googleKey) && !keys.openAiKey || !keys.claudeKey || !keys.deepseekKey) {
      finalGoogleKey = keys.googleKey;
    } else {
      finalGoogleKey = ""; // Or handle it based on your preference
    }
    
    const finalTmdbKey = keys.tmdbKey === 'default' ? TMDB_API_KEY : keys.tmdbKey;

    ctx.state.googleKey = finalGoogleKey;
    ctx.state.openAiKey = keys.openAiKey;
    ctx.state.claudeKey = keys.claudeKey;
    ctx.state.deepseekKey = keys.deepseekKey;
    ctx.state.tmdbKey = finalTmdbKey;
    ctx.state.rpdbKey = keys.rpdbKey;
    ctx.state.traktKey = keys.traktKey;
    ctx.state.userId = keys.userId;
    ctx.state.omdbKey = keys.omdbKey || String(OMDB_API_KEY);

    await next();
  } catch (error) {
    console.error("[googleKeyMiddleware] Error encountered:", error);
    ctx.state.googleKey = String(GEMINI_API_KEY);
    ctx.state.tmdbKey = String(TMDB_API_KEY);
    ctx.state.omdbKey = String(OMDB_API_KEY);
    await next();
  }
};