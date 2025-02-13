import { AppContext } from "../config/types.ts";
import { isValidGeminiApiKey } from "../utils/isValidGeminiApiKey.ts";
import { GEMINI_API_KEY } from "../config/env.ts";

export const googleKeyMiddleware = async (ctx: AppContext, next: () => Promise<unknown>) => {
  try {
    const providedKey = ctx.params.googleKey ?? "";
    ctx.state.googleKey = getGoogleKey(providedKey);
    await next();
  } catch (error) {
    console.error("Error in googleKeyMiddleware:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error." };
  }
};

function getGoogleKey(providedKey?: string): string {
    return isValidGeminiApiKey(providedKey ?? "") ? (providedKey ?? "") : GEMINI_API_KEY;
  }