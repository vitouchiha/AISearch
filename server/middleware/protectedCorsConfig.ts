import { ROOT_URL, IS_PROD } from "../config/env.ts";
import { logError } from "../utils/utils.ts";

const allowedOrigins: string[] = ROOT_URL ? [ROOT_URL] : [];

if (allowedOrigins.length === 0 && IS_PROD) {
  logError( 
    "CRITICAL SECURITY WARNING: ROOT_URL is not set in production. CORS is effectively disabled or misconfigured, potentially blocking all frontend requests.",
    new Error("Missing ROOT_URL")
  );
} else if (allowedOrigins.length === 0 && !IS_PROD) {
  console.warn("CORS Warning: ROOT_URL not set. No origins explicitly allowed. Frontend requests might fail unless served from the same origin.");
}

export const corsDelegate = (request: Request) => {
  const requestOrigin = request.headers.get("origin");
  const isAllowed = !!requestOrigin && allowedOrigins.includes(requestOrigin);

  if (isAllowed) {
    return {
      origin: requestOrigin,
      methods: "GET,POST",
      allowedHeaders: "Content-Type",
      credentials: true,
      optionsSuccessStatus: 204,
    };
  } else {
    return { origin: false };
  }
};