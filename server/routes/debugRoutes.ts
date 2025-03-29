import { Router } from "../config/deps.ts";
import { type Keys } from "../config/types/types.ts";
import { redis } from "../config/redisCache.ts";
import { saveEncryptedKeys } from "../config/database.ts";
import { decryptKeys, encryptKeys } from "../utils/encryptDecrypt.ts";
import { DEV_MODE } from "../config/env.ts";

const router = new Router();

router.post("/debug/expire-trakt-token/:userId", async (ctx) => {
    const { userId } = ctx.params;

    if (!DEV_MODE) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Route disabled." };
        return;
    }

    if (!userId) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Missing userId" };
        return;
    }

    try {
        const encrypted = await redis?.get(`user:${userId}`) as string;
        if (!encrypted) {
            ctx.response.status = 404;
            ctx.response.body = { error: "No user keys found" };
            return;
        }

        const keys: Keys = decryptKeys(encrypted);

        const newExpiration = Date.now() - 10_000; // 10 seconds ago
        keys.traktExpiresAt = newExpiration.toString();

        const updated = encryptKeys(keys);

        await Promise.all([
            redis?.set(`user:${userId}`, updated, { ex: 86400 }),
            saveEncryptedKeys(userId, updated),
        ]);

        ctx.response.status = 200;
        ctx.response.body = {
            message: `traktExpiresAt for user ${userId} set to ${newExpiration} (expired)`,
        };
    } catch (error) {
        console.error("[debug/expire-trakt-token] Error:", error);
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to update expiration" };
    }
});

export { router as debugRoutes };