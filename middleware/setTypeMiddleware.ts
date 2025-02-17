import type { AppContext } from "../config/types/types.ts";

export const setMovieType = async <P extends Record<string, string>>(
  ctx: AppContext<P>,
  next: () => Promise<unknown>,
) => {
  ctx.state.type = "movie";
  await next();
};

export const setSeriesType = async <P extends Record<string, string>>(
  ctx: AppContext<P>,
  next: () => Promise<unknown>,
) => {
  ctx.state.type = "series";
  await next();
};
