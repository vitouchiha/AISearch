export function encodeUrlSafeBase64(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeUrlSafeBase64(str: string): string {
  // Re-add padding if necessary.
  const padLength = 4 - (str.length % 4);
  const padded = padLength < 4 ? str + "=".repeat(padLength) : str;
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}
