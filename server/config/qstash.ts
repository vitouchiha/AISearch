import { QstashClient } from "./deps.ts";
import { log, logError } from "../utils/utils.ts";
import type { BackgroundTaskParams } from "./types/types.ts";
import { QSTASH_TOKEN, ROOT_URL, QSTASH_SECRET, NGROK_URL, NGROK_TOKEN } from "./env.ts";

const client = !QSTASH_TOKEN ? null : new QstashClient({
  token: QSTASH_TOKEN,
});

const DOMAIN = NGROK_TOKEN ? NGROK_URL : ROOT_URL;

export async function pushBatchToQstash(
    tasks: BackgroundTaskParams[]
  ): Promise<void> {
    if(!client) return;
    
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

  export interface ListTaskParams {
    listName: string;
    metas: { id: string }[];
    type: "movie" | "series";
    traktKey: string;
  }

  export async function pushListToQstash(tasks: ListTaskParams[]): Promise<void> {
    const endpoint = `${DOMAIN}/api/update-trakt-list`;
    const payload = JSON.stringify({ tasks });
    
    if (!client) {
      fetch(endpoint, {
        method: "POST",
        body: payload,
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          log(data ? 'Lists updated.' : 'Lists failed. No update.');
        })
        .catch((error) => {
          logError("Error updating trakt lists", error);
        });
      return;
    } 
    
    try {
      await client.publish({
        url: endpoint,
        body: payload,
        headers: {
          "Authorization": `Bearer ${QSTASH_SECRET}`,
        },
      });
      log(`Pushed ${tasks.length} background trakt list update tasks to Qstash.`);
    } catch (error) {
      logError("Error pushing background trakt list update batch to Qstash", error);
    }

  }
  
  