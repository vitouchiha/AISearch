import { Context, verify } from "../config/deps.ts";
import { JWT_SECRET } from "../config/env.ts";

export async function verifyToken(ctx: Context, next: () => Promise<unknown>) {
  const authHeader = ctx.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Missing token" };
    return;
  }
  
  const token = authHeader.split(" ")[1];
  try {
    await verify(token, JWT_SECRET, {
      predicates: [
        (payload) => payload.iss === "filmwhisper",
      ],
    });
    await next();
  } catch (err) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Invalid token" };
    return;
  }
}