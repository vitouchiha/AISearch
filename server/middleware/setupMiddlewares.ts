import { type Application } from "../config/deps.ts";
import { setupCors } from "./setupCors.ts";
import { setupSecurityHeaders } from "./setupSecurityHeaders.ts";
import { responseLog } from "./ResponseLog.ts";
import { rateLimitMiddleware } from "./ratelimitMiddleware.ts";

export function setupMiddlewares(app: Application) {
  setupSecurityHeaders(app);
  setupCors(app);
  app.use(responseLog);
  app.use(rateLimitMiddleware);
}