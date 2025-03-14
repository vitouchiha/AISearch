import { Router, helpers } from "../config/deps.ts";
import { ROOT_URL, TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET } from "../config/env.ts";
import type { Keys } from "../config/types/types.ts";
import { logError } from "../utils/utils.ts";

const router = new Router();
const API_URL = "https://api.trakt.tv";
const REDIRECT_URI = `${ROOT_URL}/auth/callback`;
let lastRequestTime = 0;

// Base headers
const getBaseHeaders = (accessToken?: string) => ({
  "Content-Type": "application/json",
  "trakt-api-key": TRAKT_CLIENT_ID,
  "trakt-api-version": "2",
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

interface FetchTraktParams {
  path: string;
  method?: "GET" | "POST" | "DELETE" | "PUT";
  body?: object;
  traktKey: string;
}

async function delayIfNeeded(method: string) {
  const now = Date.now();

  if (["POST", "PUT", "DELETE"].includes(method)) {
    const timeSinceLastRequest = now - lastRequestTime;
    const waitTime = Math.max(3000 - timeSinceLastRequest, 0);

    if (waitTime > 0) {
      console.log(`Rate limit: Waiting ${waitTime / 1000} seconds before next request...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
  }
}

async function fetchTrakt({ path, method = "GET", body, traktKey }: FetchTraktParams) {
  await delayIfNeeded(method);

  let retries = 5;

  while (retries > 0) {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: getBaseHeaders(traktKey),
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text(); // Get raw response before parsing

    if (response.ok) {
      try {
        return JSON.parse(text);
      } catch (_err) {
        console.error(`JSON Parse Error for ${method} ${path}:`, text);
        return null;
      }
    }

    console.error(`Failed to ${method} ${path}: ${text}`);

    if (text.includes("AUTHED_API_POST_LIMIT")) {
      console.log("Rate limit exceeded. Waiting 3 seconds before retrying...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      retries--;
    } else {
      return null;
    }
  }

  console.error(`Failed to ${method} ${path} after multiple retries.`);
  return null;
}


interface ListOptions {
  name: string;
  description?: string;
  privacy?: "private" | "friends" | "public";
  display_numbers?: boolean;
  allow_comments?: boolean;
  traktKey: string;
}

export async function createList({ name, description = "", privacy = "private", display_numbers = true, allow_comments = false, traktUserId, traktKey }: ListOptions & { traktUserId: string }) {
  console.log(`Creating new list: ${name}`);
  return await fetchTrakt({
    path: `/users/${traktUserId}/lists`,
    method: "POST",
    body: { name, description, privacy, display_numbers, allow_comments },
    traktKey,
  });
}

export async function addMoviesToList(slug: string, type: "movie" | "series", movies: { id?: string; imdb?: string; trakt?: number; tmdb?: number }[], traktUserId: string, traktKey: string) {
  console.log(`Adding ${type} to list: ${slug}`);

  // Validate input and determine correct payload structure
  const validItems = movies
    .filter(movie => movie.id || movie.imdb || movie.trakt || movie.tmdb) // Ensure at least one valid ID is present
    .map(movie => ({
      ids: {
        imdb: movie.imdb || movie.id || undefined,
        trakt: movie.trakt || undefined,
        tmdb: movie.tmdb || undefined,
      }
    }));

  if (validItems.length === 0) {
    console.error("No valid items found with proper IDs.");
    return;
  }

  // Trakt requires different request body structures for movies vs. shows
  const body = type === "movie"
    ? { movies: validItems }  // Use "movies" for movies
    : { shows: validItems };  // Use "shows" for TV series

  return await fetchTrakt({
    path: `/users/${traktUserId}/lists/${slug}/items`,
    method: "POST",
    body,
    traktKey,
  });
}

export async function deleteList(slug: string, traktUserId: string, traktKey: string) {
  console.log(`Deleting list: ${slug}`);
  await fetchTrakt({ path: `/users/${traktUserId}/lists/${slug}`, method: "DELETE", traktKey });
}

export async function checkList(slug: string, traktUserId: string, traktKey: string) {
  console.log(`Checking if list '${slug}' exists...`);
  const existingLists = await fetchTrakt({ path: `/users/${traktUserId}/lists`, traktKey });

  if (!existingLists) {
    console.error("Failed to fetch lists.");
    return false;
  }

  return !!existingLists.find((list: any) => list.name === slug);
}

export async function getTraktUserId(traktKey: string): Promise<string | null> {
  console.log("Fetching Trakt user ID...");
  const userSettings = await fetchTrakt({ path: "/users/settings", traktKey });

  if (!userSettings || !userSettings.user || !userSettings.user.username) {
    console.error("Failed to fetch Trakt user ID.");
    return null;
  }

  return userSettings.user.username;
}

export async function updateTraktList(metas: { id: string }[], listName: string, type: "movie" | "series", traktKey: string) {
  if (metas.length === 0) {
    console.warn(`No ${type} provided. Skipping list update.`);
    return;
  }

  const traktUserId = await getTraktUserId(traktKey);
  if (!traktUserId) {
    console.error("Failed to retrieve Trakt user ID.");
    return;
  }

  const formatListName = `fw-${listName}-${type}`;

  // Check if the list exists
  const listExists = await checkList(formatListName, traktUserId, traktKey);

  if (listExists) {
    console.log(`List '${formatListName}' exists. Deleting it first.`);
    await deleteList(formatListName, traktUserId,traktKey);
  }

  const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
  
  await createList({
    name: formatListName,
    description: `${formattedType} recommended by FilmWhisper AI`,
    privacy: "private",
    traktKey: traktKey,
    traktUserId: traktUserId,
  });

  // Convert `metas` into Trakt's expected format
  const movies = metas.map((meta) => ({ imdb: meta.id }));

  // Add movies to the new list
  await addMoviesToList(formatListName, type, movies, traktUserId, traktKey);

  console.log(`List '${formatListName}' updated successfully with ${movies.length} ${type}`);
}

export const getTraktRecentWatches = async (
  type: "movie" | "series",
  traktKey: string,
  limit: number = 25
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

    // Remove duplicate entries based on the unique identifier
    const seenIds = new Set<number | string>();
    const uniqueData = [];
    for (const event of data) {
      let id: number | string | undefined;
      if (type === "movie" && event.movie && event.movie.ids) {
        id = event.movie.ids.trakt;
      } else if (type === "series" && event.show && event.show.ids) {
        id = event.show.ids.trakt;
      }
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        uniqueData.push(event);
      }
    }
    return uniqueData;
  } catch (error) {
    console.error("Error fetching recent watches", error);
    return [];
  }
};

export const getTraktFavorites = async (
  type: "movie" | "series",
  traktKey: string,
  limit: number = 25
) => {
  const endpoint = type === "movie" ? "movies" : "shows";
  const url = `https://api.trakt.tv/sync/favorites/${endpoint}?limit=${limit}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getBaseHeaders(traktKey),
    });

    if (!response.ok) {
      throw new Error(`Error fetching favorites: ${response.statusText}`);
    }

    const data = await response.json();

    // Remove duplicate entries based on the unique identifier
    const seenIds = new Set<number | string>();
    const uniqueData = [];
    for (const item of data) {
      let id: number | string | undefined;
      if (type === "movie" && item.movie && item.movie.ids) {
        id = item.movie.ids.trakt;
      } else if (type === "series" && item.show && item.show.ids) {
        id = item.show.ids.trakt;
      }
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        uniqueData.push(item);
      }
    }

    return uniqueData;
  } catch (error) {
    console.error("Error fetching favorites", error);
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