import { oakCors, type Application } from "../config/deps.ts";

export function setupCors(app: Application) {
  app.use(
    oakCors({
      origin: "*",
      methods: ["GET", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  );
}