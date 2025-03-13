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
  origin: "https://ai.filmwhisper.dev",
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

router.post("/api/store-keys", oakCors({ origin: "https://ai.filmwhisper.dev" }), verifyToken, async (ctx) => {


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
      traktCreateLists, // displays true being sent from frontend.
    } = body;

    if (ENABLE_CAPTCHA === true) {

      if (!recaptchaToken) {
        throw new Error("Missing reCAPTCHA token");
      }
      const recaptchaSecret = CAPTCHA_SECRET_KEY;
      const recaptchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`;

      const recaptchaResponse = await fetch(recaptchaUrl, { method: "POST" });
      const recaptchaData = await recaptchaResponse.json();

      // For reCAPTCHA v3, you might want to check the score:
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

    // Probably need to check all keys here, except trakt, we check that using oAuth.

    const keys: Keys = {
      claudeKey: claudeKey || "",
      googleKey: googleKey || "",
      openAiKey: openaiKey || "",
      deepseekKey: deepseekKey || "",
      tmdbKey: tmdbKey || "default",
      rpdbKey: rpdbKey || "",
      traktKey: traktKey || "",
      traktRefresh: traktRefresh || "",
      traktExpiresAt: traktExpiresAt || "",
      traktCreateList: traktCreateLists || false, // shows false here..
      omdbKey: omdbKey || "",
    };

    const set = await redis?.set(`user:${userId}`, encryptKeys(keys));
    console.log(set);

    ctx.response.status = 200;
    ctx.response.body = { userId };
  } catch (error) {
    console.error("[store-keys] Error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to store keys" };
  }
}
);

export { router as keysRoutes };