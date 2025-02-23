import { Router, helpers } from "../config/deps.ts";
import { ROOT_URL, TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET } from "../config/env.ts";
import type { Keys } from "../config/types/types.ts";
import { logError } from "../utils/utils.ts";

const router = new Router();
const API_URL = "https://api.trakt.tv";
const REDIRECT_URI = `${ROOT_URL}/auth/callback`;

// Base headers
const getBaseHeaders = (accessToken?: string) => ({
  "Content-Type": "application/json",
  "trakt-api-key": TRAKT_CLIENT_ID,
  "trakt-api-version": "2",
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

export const getTraktRecentWatches = async (
  type: "movie" | "series",
  traktKey: string,
  limit: number = 10
) => {
  const endpoint = type === "movie" ? "movies" : "shows";
  const url = `https://api.trakt.tv/sync/history/${endpoint}?limit=${limit}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getBaseHeaders(traktKey),
    });

    if (!response.ok) {
      throw new Error(`Error fetching recent watches: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching recent watches", error);
    return [];
  }
};

export async function refreshTraktToken(refreshToken: string): Promise<Partial<Keys>> {
  try {
    const response = await fetch("https://api.trakt.tv/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: TRAKT_CLIENT_ID,
        client_secret: TRAKT_CLIENT_SECRET,
        redirect_uri: `${ROOT_URL}/auth/callback`,
        grant_type: "refresh_token",
      }),
    });
    const data = await response.json();
    return {
      traktKey: data.access_token,
      traktRefresh: data.refresh_token,
      traktExpiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
  } catch (error) {
    console.error("[refreshTraktToken] Error:", error);
    throw error;
  }
}

interface TraktTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

// OAuth Routes
router.get("/auth/login", (ctx) => {
  const authUrl =
    `${API_URL}/oauth/authorize?` +
    new URLSearchParams({
      response_type: "code",
      client_id: TRAKT_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: crypto.randomUUID(),
      scope: "public",
    }).toString();

  ctx.response.redirect(authUrl);
});

router.get("/auth/callback", async (ctx) => {
  const { code } = helpers.getQuery(ctx);

  if (!code) {
    ctx.response.status = 400;
    ctx.response.body = { error: "No authorization code provided" };
    return;
  }

  try {
    const response = await fetch(`${API_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: TRAKT_CLIENT_ID,
        client_secret: TRAKT_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.statusText}`);
    }

    const tokenData: TraktTokenResponse = await response.json();

    const expiresAt = (tokenData.created_at + tokenData.expires_in) * 1000;

    const redirectUrl = `${ROOT_URL}/configure?` +
    new URLSearchParams({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toString(),
    }).toString();

    ctx.response.status = 302;
    ctx.response.headers.set("Location", redirectUrl);
  } catch (error) {
    logError("Authorization failed for Trakt: ", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Authentication failed" };
  }
});

export { router as traktRouter };