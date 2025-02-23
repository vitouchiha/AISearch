import { Router } from "./config/deps.ts";
import type { Keys } from "./config/types/types.ts";
import { encryptKeys } from "./utils/encryptDecrypt.ts";
import { redis } from "./config/redisCache.ts";

const router = new Router();

router.post("/api/store-keys", async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { userId, openaiKey, googleKey, deepseekKey, tmdbKey, rpdbKey, traktKey, traktRefresh, traktExpiresAt } = body;
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
    };
    
    await redis?.set(`user:${userId}`, encryptKeys(keys));
    ctx.response.status = 200;
    ctx.response.body = { userId };
  } catch (error) {
    console.error("[store-keys] Error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to store keys" };
  }
});

export { router as KeysRoutes };