import { type Context, Router, Receiver } from "../config/deps.ts";
import { redis } from "../config/redisCache.ts";
import { fetchNewDataInBackground } from "../services/tmdbHelpers/fetchNewDataInBackground.ts";
import { QSTASH_SECRET, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY, ROOT_URL, DEV_MODE, NGROK_URL } from "../config/env.ts";
import { updateTraktList } from "../services/trakt.ts";
import { ListTaskParams } from "../config/qstash.ts";

interface BackgroundTask {
  type: "movie" | "series";
  movieName: string;
  lang: string;
  tmdbKey: string;
  omdbKey: string;
  redisKey: string;
}

const DOMAIN = DEV_MODE === "true" ? NGROK_URL : ROOT_URL;

const handleCacheUpdateBatch = async (ctx: Context): Promise<void> => {
  const signature = ctx.request.headers.get("upstash-signature");
  if (!signature) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Missing signature" };
    return;
  }

  const receiver = new Receiver({
    currentSigningKey: String(QSTASH_CURRENT_SIGNING_KEY),
    nextSigningKey: String(QSTASH_NEXT_SIGNING_KEY),
  });

  const rawBody = await ctx.request.body({ type: "text" }).value;
  try {
    await receiver.verify({
      signature,
      body: rawBody,
      url: `${DOMAIN}/api/cache-update`,
    });
  } catch (_err) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Invalid signature" };
    return;
  }

  const authHeader = ctx.request.headers.get("authorization");
  if (authHeader !== `Bearer ${QSTASH_SECRET}`) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  // Parse the raw body as JSON.
  let parsedBody: Record<string, string>;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (_err) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid JSON body" };
    return;
  }

  const { tasks } = parsedBody;
  if (!Array.isArray(tasks)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid tasks format. Expected an array." };
    return;
  }

  // Process each task concurrently.
  const results = await Promise.all(
    tasks.map((task: BackgroundTask) =>
      fetchNewDataInBackground(
        task.type,
        task.movieName,
        task.lang,
        task.tmdbKey,
        task.omdbKey,
        task.redisKey
      )
    )
  );

  const msetObj = results.reduce((acc: Record<string, string>, cur) => {
    if (cur) return { ...acc, ...cur };
    return acc;
  }, {});

  if (Object.keys(msetObj).length > 0 && redis) await redis.mset(msetObj);

  console.log("!!! Used Qstash Success !!!");
  console.log(`Processed ${tasks.length} tasks!`);
  ctx.response.status = 200;
  ctx.response.body = { message: `Processed ${tasks.length} tasks` };
};

const handleUpdateTraktList = async (ctx: Context): Promise<void> => {
  const rawBody = await ctx.request.body({ type: "text" }).value;

  if (QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY && QSTASH_SECRET) {
    const signature = ctx.request.headers.get("upstash-signature");
    if (!signature) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Missing signature" };
      return;
    }

    const receiver = new Receiver({
      currentSigningKey: String(QSTASH_CURRENT_SIGNING_KEY),
      nextSigningKey: String(QSTASH_NEXT_SIGNING_KEY),
    });

    try {
      await receiver.verify({
        signature,
        body: rawBody,
        url: `${DOMAIN}/api/update-trakt-list`,
      });
    } catch (_err) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid signature" };
      return;
    }

    const authHeader = ctx.request.headers.get("authorization");
    if (authHeader !== `Bearer ${QSTASH_SECRET}`) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }
  }

  // Parse the raw body as JSON.
  let parsedBody: Record<string, string>;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (_err) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid JSON body" };
    return;
  }

  const { tasks } = parsedBody;
  if (!Array.isArray(tasks)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid tasks format. Expected an array." };
    return;
  }

  // Process each task slowly
  for (const task of tasks) {
    await updateTraktList(task.metas, task.listName, task.type, task.traktKey);
  }

  console.log("!!! Used Qstash Success !!!");
  console.log(`Processed ${tasks.length} tasks!`);
  ctx.response.status = 200;
  ctx.response.body = { message: `Processed ${tasks.length} tasks` };
};


const router = new Router();
router.post("/api/cache-update", handleCacheUpdateBatch);
router.post("/api/update-trakt-list", handleUpdateTraktList);
export { router as cacheRoute };