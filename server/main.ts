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
} from "./routes/setup.ts";

import { handleServerError } from "./handlers/handleServerError.ts";
import { logStartupInfo } from "./utils/startupLog.ts";
import { setupMiddlewares } from "./middleware/setupMiddlewares.ts";

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
  ]);

  setupFallbackRoute(app);

  app.addEventListener("error", handleServerError);
  app.addEventListener("listen", () => logStartupInfo());

  await app.listen({ hostname: "0.0.0.0", port: PORT });
}

try {
  await startServer();
} catch (err) {
  console.error("❌   Failed to start server:", err);
}
