import { Application } from "./config/deps.ts";
import { PORT } from "./config/env.ts";

import {
  setupRoutes,
  setupFallbackRoute,
  routes,
  traktRoutes,
  keysRoutes,
  cacheRoute,
  keyCheckRoutes,
  configJsonRoute,
  debugRoutes,
} from "./routes/setup.ts";

import { handleServerError } from "./handlers/handleServerError.ts";
import { logStartupInfo } from "./utils/startupLog.ts";
import { setupMiddlewares } from "./middleware/setupMiddlewares.ts";
import { initDatabase } from "./config/database.ts";

async function startServer() {
  const app = new Application();

  setupMiddlewares(app);

  setupRoutes(app, [
    { router: routes },
    { router: traktRoutes },
    { router: keysRoutes },
    { router: cacheRoute },
    { router: configJsonRoute },
    { router: keyCheckRoutes },
    { router: debugRoutes },
  ]);

  setupFallbackRoute(app);
  initDatabase();

  app.addEventListener("error", handleServerError);
  app.addEventListener("listen", () => logStartupInfo());

  await app.listen({ hostname: "0.0.0.0", port: PORT });
}

try {
  await startServer();
} catch (err) {
  console.error("❌   Failed to start server:", err);
}
