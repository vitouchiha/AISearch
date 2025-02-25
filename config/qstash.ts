import { QstashClient } from "./deps.ts";
import { log, logError } from "../utils/utils.ts";
import type { BackgroundTaskParams } from "./types/types.ts";
import { DEV_MODE, NGROK_URL, QSTASH_TOKEN, ROOT_URL, QSTASH_SECRET } from "./env.ts";

const client = new QstashClient({
  token: QSTASH_TOKEN,
});

const DOMAIN = DEV_MODE === "true" ? NGROK_URL : ROOT_URL;

export async function pushBatchToQstash(
    tasks: BackgroundTaskParams[]
  ): Promise<void> {
    try {
      await client.publish({
        url: `${DOMAIN}/api/cache-update`,
        body: JSON.stringify({ tasks }),
        headers: {
            "Authorization": `Bearer ${QSTASH_SECRET}`,
          },
    });
      log(`Pushed ${tasks.length} background cache update tasks to Qstash.`);
    } catch (error) {
      logError("Error pushing background update batch to Qstash", error);
    }
  }