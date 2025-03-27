import { Context, verify } from "../config/deps.ts";
import { JWT_SECRET } from "../config/env.ts";
import { logError } from "../utils/utils.ts";

export async function verifyToken(ctx: Context, next: () => Promise<unknown>) {

  if (!JWT_SECRET) {
    console.warn("JWT_SECRET is not set. Skipping token verification.");
    return await next();
  }

  // Try to get token from Authorization header first…
  let token: string | undefined = ctx.request.headers.get("Authorization")?.split(" ")[1];

  // …if not found, check the cookie (await the promise)
  if (!token) {
    token = await ctx.cookies.get("auth_token");
  }

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Missing token" };
    return;
  }

  try {
    const payload = await verify(token, JWT_SECRET, {
      predicates: [(payload) => payload.iss === "filmwhisper"],
    });
    ctx.state.user = payload;
    await next();
  } catch (err) {
    logError("Error with JWT Token", err);
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Invalid token" };
    return;
  }
}