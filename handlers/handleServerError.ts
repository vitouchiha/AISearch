import { log, logError } from "../utils/utils.ts";

/**
 * Handle server errors
 */
export function handleServerError(evt: ErrorEvent) {
  const error = evt.error;
  
  if (error instanceof Deno.errors.BrokenPipe || error.message.includes("broken pipe")) {
    log("Client disconnected early (broken pipe). Ignoring...");
    return;
  }
  
  logError(`Unhandled error:`, error);
}