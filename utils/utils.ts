import { DEV_MODE } from "../config/env.ts";

export const timestamp = () => new Date().toISOString();
export const log = (msg: string) =>
  DEV_MODE && console.log(`[${timestamp()}] ${msg}`);
export const logError = (msg: string, err: unknown) =>
  DEV_MODE && err instanceof Error &&
  console.error(`[${timestamp()}] ${msg}`, err.message);

export async function fetchJson(url: string, label: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${label} API responded with status ${res.status}`);
  }
  return res.json();
}
