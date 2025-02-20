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
  return res.json();
}


export async function validatePosterUrl(url: string) {
  try {
    //const response = await fetch(url, { method: "HEAD" });
    //return response.ok && response.headers.get("content-type")?.startsWith("image/");
    return true;
  } catch (error) {
    logError(`HEAD request failed for ${url}:`, error);
    return false;
  }
}