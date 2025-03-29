import type { Application } from "../config/deps.ts";

export { traktRouter as traktRoutes } from '../services/trakt.ts';
export { keysRoutes } from './keysRoutes.ts';
export { cacheRoute } from './stashRoute.ts';
export { configJsonRoute } from './configJsonRoute.ts';
export { debugRoutes } from './debugRoutes.ts';

export { default as routes } from "./routes.ts";
export { default as keyCheckRoutes } from "./apiKeyCheckRoutes.ts";

export function setupRoutes(app: Application, routeConfigs: { router: any }[]) {
  for (const { router } of routeConfigs) {
    app.use(router.routes());
    app.use(router.allowedMethods());
  }
}

export function setupFallbackRoute(app: Application) {
  app.use((ctx) => {
    ctx.response.status = 404;
    ctx.response.body = { error: "Endpoint not found" };
  });
}