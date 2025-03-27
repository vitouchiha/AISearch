import { Context, Router, oakCors } from "../config/deps.ts";
import { verifyToken } from "../middleware/apiAuth.ts";
import { corsDelegate } from "../middleware/protectedCorsConfig.ts";

const router = new Router();

async function checkApi(
  url: string,
  apiKey: string,
  method = "GET",
  body?: any
) {
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return { error: `API responded with status ${response.status}` };
    }
    await response.json();
    return { status: "valid" };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}

router.use(oakCors(corsDelegate));

router.post('/api/key/check', verifyToken, async (ctx: Context) => {
  const { claudeKey, geminiKey, deepSeekKey, featherlessKey, openaiKey, tmdbKey } =
    await ctx.request.body({ type: "json" }).value;

  // If no provider keys were provided, return a 400 error.
  if (!claudeKey && !geminiKey && !deepSeekKey && !featherlessKey && !openaiKey && !tmdbKey) {
    ctx.response.status = 400;
    ctx.response.body = { error: "No provider keys were provided." };
    return;
  }

  const providerPromises: Record<string, Promise<any>> = {};

  if (claudeKey) {
    const claudePayload = {
      prompt: "Hello",
      model: "claude-v1",
      max_tokens_to_sample: 1,
      stop_sequences: []
    };
    providerPromises["claude"] = checkApi(
      "https://api.anthropic.com/v1/complete",
      claudeKey,
      "POST",
      claudePayload
    );
  }

  if (openaiKey) {
    providerPromises["openai"] = checkApi(
      "https://api.openai.com/v1/models",
      openaiKey,
      "GET"
    );
  }

  if (deepSeekKey) {
    const deepSeekPayload = {
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Hello" }],
      stream: false
    };
    providerPromises["deepseek"] = checkApi(
      "https://api.deepseek.com/chat/completions",
      deepSeekKey,
      "POST",
      deepSeekPayload
    );
  }

  if (geminiKey) {
    providerPromises["gemini"] = checkApi(
      "https://generativelanguage.googleapis.com/v1beta/openai/models",
      geminiKey,
      "GET"
    );
  }

  if (featherlessKey) {
    const featherlessPayload = {
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      messages: [{ role: "user", content: "Hello" }],
      stream: false
    };
    providerPromises["featherless"] = checkApi(
      "https://api.featherless.ai/v1/chat/completions",
      featherlessKey,
      "POST",
      featherlessPayload
    );
  }

  if (tmdbKey) {
    providerPromises["tmdb"] = checkApi(
      `https://api.themoviedb.org/3/configuration?api_key=${tmdbKey}`,
      tmdbKey,
      "GET"
    );
  }

  const results = await Promise.all(
    Object.entries(providerPromises).map(async ([provider, promise]) => {
      const result = await promise;
      return [provider, result];
    })
  );

  const aggregatedResult = Object.fromEntries(results);

  ctx.response.status = 200;
  ctx.response.body = aggregatedResult;
});

export default router;