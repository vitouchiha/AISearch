import { DEV_MODE } from "../config/env.ts";

export const timestamp = () => new Date().toISOString();

export const log = (msg: string) =>
  DEV_MODE && console.log(`[${timestamp()}] ${msg}`);

export const logError = (msg: string, err: unknown) =>
  err instanceof Error && console.error(`[${timestamp()}] ${msg}`, err.message);

export async function fetchJson(url: string, label: string) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`${label} API responded with status ${res.status}`);
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


type FormatRuntimeOptions = {
  shortFormat?: boolean;
  fallback?: string;
};

export function formatRuntime(
  raw: number | string | undefined,
  options: FormatRuntimeOptions = {}
): string {
  const { shortFormat = false, fallback = "0 minutes" } = options;
  const totalMinutes = typeof raw === "string" ? parseInt(raw, 10) : raw;

  if (!totalMinutes || totalMinutes <= 0) return fallback;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (shortFormat) {
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  }

  if (hrs === 0) {
    const minLabel = mins === 1 ? "minute" : "minutes";
    return `${mins} ${minLabel}`;
  }

  const hourLabel = hrs === 1 ? "hour" : "hours";
  const minLabel = mins === 1 ? "minute" : "minutes";
  return `${hrs} ${hourLabel}, ${mins} ${minLabel}`;
}