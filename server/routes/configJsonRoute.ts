import { Context, Router, oakCors } from "../config/deps.ts";
import { ROOT_URL, DEV_MODE, CAPTCHA_SITE_KEY, ENABLE_CAPTCHA } from "../config/env.ts";
import { createManifest } from "../config/manifest.ts";
import { corsDelegate } from "../middleware/protectedCorsConfig.ts";


import { redis } from "../config/redisCache.ts";
import { index } from "../config/semanticCache.ts";

const STATIC_MANIFEST =  await createManifest();


const router = new Router();
//router.use(oakCors(corsDelegate));


router.get("/config.json", async (ctx: Context) => {
    ctx.response.status = 200;
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.headers.set("Cache-Control", "no-cache"); 
  
    const [
      installsVal,
      dbSizeVal,
      indexInfo,
    ] = await Promise.all([
      redis ? redis.get<string>("manifest_requests") : Promise.resolve(null),
      redis ? redis.dbsize() : Promise.resolve(null),
      index ? index.info() : Promise.resolve(null),
    ]);
  
    const installs = installsVal || "0";
    const dbSize = (dbSizeVal !== null && dbSizeVal !== undefined)
      ? String(dbSizeVal)
      : "0";
  
    const vectorCountNumber = indexInfo?.vectorCount ?? 0;
    const vectorCount = vectorCountNumber ? String(vectorCountNumber) : "NO CACHE";
  
    if (vectorCountNumber > 58000 && index) await index.reset();
  
    const config = {
      ROOT_URL: ROOT_URL,
      VERSION: STATIC_MANIFEST.version,
      DEV_MODE: DEV_MODE,
      CAPTCHA_SITE_KEY: ENABLE_CAPTCHA ? String(CAPTCHA_SITE_KEY) : '',
      DB_SIZE: dbSize,
      INSTALLS: installs,
      VECTOR_COUNT: vectorCount,
    };
    
    ctx.response.body = JSON.stringify(config);
  });

  export { router as configJsonRoute };