import { DEV_MODE, NGROK_URL, NO_SEMANTIC_SEARCH, JWT_SECRET, CAPTCHA_SITE_KEY, CAPTCHA_SECRET_KEY, PORT } from "../config/env.ts";

export function logStartupInfo() {
    console.log(`✅   Stremio AI Addon running on port ${PORT}`);
    if (DEV_MODE) {
      const devInfo = {
        "Ngrok URL": NGROK_URL || "Not set",
        "Semantic Caching": NO_SEMANTIC_SEARCH ? "Disabled" : "Enabled",
        "JWT Auth": JWT_SECRET ? "Enabled" : "Disabled",
        "Captcha": CAPTCHA_SITE_KEY && CAPTCHA_SECRET_KEY ? "Enabled" : "Disabled",
      };
      console.table(devInfo);
    }
  }