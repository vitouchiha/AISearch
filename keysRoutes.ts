import { Router, oakCors, create, getNumericDate } from "./config/deps.ts";
import type { Keys } from "./config/types/types.ts";
import { encryptKeys } from "./utils/encryptDecrypt.ts";
import { redis } from "./config/redisCache.ts";
import { JWT_SECRET } from "./config/env.ts";
import { verifyToken } from "./middleware/apiAuth.ts";
import { tokenRateLimitMiddleware } from "./middleware/ratelimitMiddleware.ts";

const router = new Router();

router.options("/api/store-keys", oakCors({
  origin: "https://ai.filmwhisper.dev",
}));

router.get("/api/generate-token", tokenRateLimitMiddleware, async (ctx) => {
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
      const {
        userId,
        omdbKey,
        openaiKey,
        googleKey,
        deepseekKey,
        tmdbKey,
        rpdbKey,
        traktKey,
        traktRefresh,
        traktExpiresAt,
      } = body;
      
      if (!userId) throw new Error("User ID required");

      const keys: Keys = {
        googleKey: googleKey || "",
        openAiKey: openaiKey || "",
        deepseekKey: deepseekKey || "",
        tmdbKey: tmdbKey || "default",
        rpdbKey: rpdbKey || "",
        traktKey: traktKey || "",
        traktRefresh: traktRefresh || "",
        traktExpiresAt: traktExpiresAt || "",
        omdbKey: omdbKey || "",
      };

      await redis?.set(`user:${userId}`, encryptKeys(keys));
      ctx.response.status = 200;
      ctx.response.body = { userId };
    } catch (error) {
      console.error("[store-keys] Error:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to store keys" };
    }
  }
);

export { router as KeysRoutes };