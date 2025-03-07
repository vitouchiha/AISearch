import type { Application } from "../config/deps.ts";

export { traktRouter as traktRoutes } from '../services/trakt.ts';
export { keysRoutes } from './keysRoutes.ts';
export { cacheRoute } from './stashRoute.ts';
export { default as routes } from "./routes.ts";

/**
 * Configure routes for the app
 */
export function setupRoutes(app: Application, routeConfigs: { router: any }[]) {
  for (const { router } of routeConfigs) {
    app.use(router.routes());
    app.use(router.allowedMethods());
  }
}