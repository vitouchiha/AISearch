import { DEV_MODE } from "../config/env.ts";

export const timestamp = () => new Date().toISOString();

export const log = (msg: string) =>
  DEV_MODE && console.log(`[${timestamp()}] ${msg}`);

export const logError = (msg: string, err: unknown) =>
  err instanceof Error && console.error(`[${timestamp()}] ${msg}`, err.message);

export async function fetchJson(url: string, label: string) {
  const res = await fetch(url);
  if (!res.ok) {
    logError(`${label} API responded with status ${res.status}`, res);
  }
  log(`Fetched ${url}`);
  return res.json();
}

export function validatePosterUrl(url: string) {
  try {
    // dont forget to async this if you use it.
    //const response = await fetch(url, { method: "HEAD" });
    //return response.ok && response.headers.get("content-type")?.startsWith("image/");
    return true;
  } catch (error) {
    logError(`HEAD request failed for ${url}:`, error);
    return false;
  }
}

export const isFulfilled = <T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> => result.status === "fulfilled";


export function formatRuntime(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 minutes";
  
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) return `${mins} minutes`;
  return `${hrs} hours ${mins} minutes`;
}