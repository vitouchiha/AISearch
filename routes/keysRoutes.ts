import { Context, Router, oakCors, create, getNumericDate } from "../config/deps.ts";
import type { Keys } from "../config/types/types.ts";
import { encryptKeys } from "../utils/encryptDecrypt.ts";
import { redis } from "../config/redisCache.ts";
import { CAPTCHA_SECRET_KEY, JWT_SECRET, ENABLE_CAPTCHA } from "../config/env.ts";
import { verifyToken } from "../middleware/apiAuth.ts";
import { tokenRateLimitMiddleware } from "../middleware/ratelimitMiddleware.ts";
import { tmdbHealthCheck } from "../services/tmdb.ts";
import { generateUserId, isValidUUID } from "../utils/UserId.ts";

const router = new Router();

router.options("/api/store-keys", oakCors({
  origin: "*",
}));

router.get("/api/generate-token", tokenRateLimitMiddleware, async (ctx: Context) => {
  const payload = {
    iss: "filmwhisper",
    exp: getNumericDate(60 * 60),
    role: "guest",
  };

  const token = await create({ alg: "HS256", typ: "JWT" }, payload, JWT_SECRET);

  ctx.response.body = { token };
});

router.post("/api/store-keys", oakCors({ origin: "*" }), verifyToken, async (ctx: Context) => {
  try {
    const body = await ctx.request.body().value;
    let {
      userId,
      recaptchaToken,
      omdbKey,
      openaiKey,
      googleKey,
      claudeKey,
      deepseekKey,
      tmdbKey,
      rpdbKey,
      traktKey,
      traktRefresh,
      traktExpiresAt,
      traktCreateLists,
      featherlessKey,
      featherlessModel,
    } = body;

    if (ENABLE_CAPTCHA === true) {
      if (!recaptchaToken) {
        throw new Error("Missing reCAPTCHA token");
      }
      const recaptchaSecret = CAPTCHA_SECRET_KEY;
      const recaptchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`;
      const recaptchaResponse = await fetch(recaptchaUrl, { method: "POST" });
      const recaptchaData = await recaptchaResponse.json();
      if (!recaptchaData.success || recaptchaData.score < 0.5) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Failed reCAPTCHA verification" };
        return;
      }
    }

    if (!userId || !isValidUUID(userId)) {
      userId = generateUserId();
    }

    const tmdbResponse = await tmdbHealthCheck(tmdbKey);
    if (!tmdbResponse) tmdbKey = "default";

    // Build keys object
    const keys: Keys = {
      claudeKey: claudeKey?.trim() || "",
      googleKey: googleKey?.trim() || "",
      openAiKey: openaiKey?.trim() || "",
      deepseekKey: deepseekKey?.trim() || "",
      tmdbKey: tmdbKey?.trim() || "default",
      rpdbKey: rpdbKey?.trim() || "",
      traktKey: traktKey?.trim() || "",
      traktRefresh: traktRefresh?.trim() || "",
      traktExpiresAt: traktExpiresAt?.trim() || "",
      traktCreateList: traktCreateLists || false,
      omdbKey: omdbKey?.trim() || "",
      featherlessKey: featherlessKey?.trim() || "",
      featherlessModel: featherlessModel?.trim() || "",
    };

    // console.log("Keys to encrypt:", keys);

    // Encrypt keys using your structured JSON approach
    const encryptedString = encryptKeys(keys);
    // console.log("Encrypted string length:", encryptedString.length);

    // Save the encrypted string to Redis
    await redis?.set(`user:${userId}`, encryptedString);

    // Retrieve the encrypted string from Redis for testing
    // const retrieved = await redis?.get(`user:${userId}`);
    // if (!retrieved) {
      // console.error("No encrypted data retrieved from Redis");
    //   ctx.response.status = 500;
    //   ctx.response.body = { error: "Failed to retrieve encrypted keys" };
    //   return;
    // }
    // console.log("Retrieved encrypted string length:", retrieved.length);

    // Decrypt the retrieved data
    // const decryptedKeys = decryptKeys(retrieved);
    // console.log("Decrypted keys:", decryptedKeys);

    ctx.response.status = 200;
    ctx.response.body = { userId };
  } catch (error) {
    console.error("[store-keys] Error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to store keys", message: error?.message };
  }
});


export { router as keysRoutes };