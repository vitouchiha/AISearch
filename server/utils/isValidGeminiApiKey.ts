export function isValidGeminiApiKey(key: string): boolean {
  if (!key) return false;
  if (typeof key !== "string") return false;

  const keyFormat = /^AIza[a-zA-Z0-9_-]{35,39}$/;
  if (!keyFormat.test(key)) return false;

  return true;
}
