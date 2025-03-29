import {
  Context,
  Router,
  oakCors,
  create,
  setCookie,
  deleteCookie,
} from "../config/deps.ts";
import type { Keys } from "../config/types/types.ts";

import { encryptKeys } from "../utils/encryptDecrypt.ts";
import { redis } from "../config/redisCache.ts";
import { saveEncryptedKeys } from "../config/database.ts";

import {
  JWT_SECRET,
  IS_PROD,
  ROOT_URL,
} from "../config/env.ts";
import { verifyToken } from "../middleware/apiAuth.ts";
import { tmdbHealthCheck } from "../services/tmdb.ts";
import { generateUserId, isValidUUID } from "../utils/UserId.ts";
import { logError } from "../utils/utils.ts";
import { corsDelegate } from "../middleware/protectedCorsConfig.ts";

const parseBoolean = (value: unknown, defaultValue: boolean = false): boolean =>
  typeof value === "boolean"
    ? value
    : String(value).toLowerCase() === "true" || defaultValue;

const sanitizeLanguage = (value: unknown, defaultValue: string = "en"): string =>
  typeof value === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(value.trim())
    ? value.trim()
    : defaultValue;

const COOKIE_NAME = "auth_token";
const EXPECTED_ISSUER = "filmwhisper";
const EXPECTED_AUDIENCE = "filmwhisper-api";
const JWT_EXPIRY_SECONDS = 60 * 60; // 1 hour

const router = new Router();

router.use(oakCors(corsDelegate));

router.post(
  "/api/generate-token",
  async (ctx: Context) => {
    if (!JWT_SECRET) {
      deleteCookie(ctx.response.headers, COOKIE_NAME, { path: "/" });
      ctx.response.status = 200;
      ctx.response.body = { message: "JWT authentication disabled" };
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const expires = now + JWT_EXPIRY_SECONDS;

    const payload = {
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      exp: expires,
      iat: now,
      nbf: now,
      role: "guest",
    };

    try {
      const token = await create({ alg: "HS256", typ: "JWT" }, payload, JWT_SECRET);
      const cookieExpires = new Date(expires * 1000);


      const validCookieDomain = (() => {
        if (!ROOT_URL) return undefined;
        try {
          const url = new URL(ROOT_URL);
          return url.hostname === "localhost" ? undefined : url.hostname;
        } catch (e) {
          return undefined;
        }
      })();      

      setCookie(ctx.response.headers, {
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: IS_PROD ?? true,
        sameSite: "Lax",
        path: "/",
        expires: cookieExpires,
        domain: validCookieDomain,
      });

      ctx.response.status = 200;
      ctx.response.headers.set("Content-Type", "application/json");
      ctx.response.body = { message: "Authentication token set successfully." };
    } catch (error) {
      logError("Failed to generate or set JWT cookie", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to initiate session." };
    }
  }
);

router.post(
  "/api/store-keys",
  verifyToken,
  async (ctx: Context) => {
    try {
      const body = await ctx.request.body({ type: "json" }).value;

      let userId = ctx.state.user?.userId || body?.userId;
      if (!userId || !isValidUUID(userId)) {
        userId = generateUserId();
      }

      // --- TMDB Key Check ---
      let tmdbKeyInput = body?.tmdbKey?.trim() || "";
      if (tmdbKeyInput) {
        const isValidTmdbKey = await tmdbHealthCheck(tmdbKeyInput);
        tmdbKeyInput = isValidTmdbKey ? tmdbKeyInput : "default";
      } else {
        tmdbKeyInput = "default";
      }

      const keys: Keys = {
        claudeKey: body?.claudeKey?.trim() || "",
        googleKey: body?.googleKey?.trim() || "",
        openAiKey: body?.openaiKey?.trim() || "",
        deepseekKey: body?.deepseekKey?.trim() || "",
        tmdbKey: tmdbKeyInput,
        rpdbKey: body?.rpdbKey?.trim() || "",
        traktKey: body?.traktKey?.trim() || "",
        traktRefresh: body?.traktRefresh?.trim() || "",
        traktExpiresAt: body?.traktExpiresAt,
        traktCreateLists: parseBoolean(body?.traktCreateLists, false),
        trendingCatalogs: parseBoolean(body?.trendingCatalogs, false),
        traktCatalogs: parseBoolean(body?.traktCatalogs, false),
        tmdbLanguage: sanitizeLanguage(body?.tmdbLanguage, "en"),
        omdbKey: body?.omdbKey?.trim() || "",
        featherlessKey: body?.featherlessKey?.trim() || "",
        featherlessModel: body?.featherlessModel?.trim() || "",
      };

      const encryptedString = encryptKeys(keys);

      if (!redis) {
        logError("Redis client not available for storing keys", new Error("Redis client missing"));
        ctx.response.status = 503;
        ctx.response.body = { error: "Storage service temporarily unavailable" };
        return;
      }

      await redis.set(`user:${userId}`, encryptedString, { ex: 86400 });

      await saveEncryptedKeys(userId, encryptedString);

      ctx.response.status = 200;
      ctx.response.body = { userId };
    } catch (error) {
      logError("[store-keys] Error", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "An unexpected error occurred while storing keys." };
    }
  }
);

export { router as keysRoutes };