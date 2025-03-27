import { Router, Context } from '../config/deps.ts'; 
import { GoogleAuth, JWTOptions } from "npm:google-auth-library@9.15.1";

interface BigQueryJobResponse {
  kind: string;
  schema?: {
    fields: { name: string; type: string; mode?: string }[];
  };
  jobReference: { projectId: string; jobId: string; location: string };
  totalRows: string;
  rows?: { f: { v: any }[] }[];
  totalBytesProcessed: string;
  jobComplete: boolean;
  cacheHit?: boolean;
}

function getServiceAccountCredentials(): JWTOptions & { project_id: string } {
  const credJson = Deno.env.get("GCP_SERVICE_ACCOUNT");
  if (!credJson) {
    throw new Error("GCP_SERVICE_ACCOUNT environment variable not set or empty");
  }
  try {
    const credentials = JSON.parse(credJson);
    if (!credentials.client_email || 
        !credentials.private_key || 
        !credentials.project_id ||
        !credentials.token_uri) {
        throw new Error("Missing required fields in service account JSON");
    }
    return credentials as JWTOptions & { project_id: string };
  } catch (error) {
    throw new Error(`Invalid service account JSON: ${error.message}`);
  }
}

function getRequiredEnv(key: string): string {
    const value = Deno.env.get(key);
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

async function getAccessToken(credentials: JWTOptions): Promise<string> {
  console.log("Obtaining Google access token...");
  try {
    const auth = new GoogleAuth({
        credentials: credentials as JWTOptions,
        scopes: ["https://www.googleapis.com/auth/bigquery.readonly"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token) throw new Error("Empty access token received");
    return token;
  } catch (error) {
    console.error("Token acquisition failed:", error);
    throw new Error(`Authentication error: ${error.message}`);
  }
}

async function runBigQueryQuery(
  query: string,
  accessToken: string,
  projectId: string,
): Promise<Record<string, any>[]> {
  console.log(`Executing BigQuery query on project ${projectId}`);
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/jobs`; // Correct endpoint [[5]]

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: query,
      useLegacySql: false,
    }),
  });

  const result: BigQueryJobResponse = await response.json();

  if (!response.ok) {
    const errorDetails = result.error?.message || "Unknown BigQuery error";
    throw new Error(`BigQuery API error (${response.status}): ${errorDetails}`);
  }

  // Handle job completion status [[3]]
  let jobComplete = result.jobComplete;
  let currentResult = result;
  while (!jobComplete) {
    console.log("Job not complete, waiting 2 seconds before retry...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/jobs/${currentResult.jobReference.jobId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    currentResult = await statusResponse.json();
    jobComplete = currentResult.jobComplete;
  }

  if (!currentResult.schema?.fields) { // Safe schema access [[7]]
    throw new Error("Query result missing schema information");
  }

  return (currentResult.rows || []).map(row => {
    const obj: Record<string, any> = {};
    currentResult.schema!.fields.forEach((field, index) => {
      obj[field.name] = row.f?.[index]?.v;
    });
    return obj;
  });
}

async function getTotalCostPerMonth(): Promise<Record<string, any>[]> {
  const credentials = getServiceAccountCredentials();
  const projectId = credentials.project_id; 
  const billingTableId = getRequiredEnv("BQ_BILLING_TABLE"); 

  const accessToken = await getAccessToken(credentials);

  const query = `
    SELECT
      TIMESTAMP_TRUNC(usage_start_time, MONTH) AS billing_month,
      SUM(cost) AS total_cost
    FROM \`${billingTableId}\`
    GROUP BY billing_month
    ORDER BY billing_month ASC
  `;

  return await runBigQueryQuery(query, accessToken, projectId);
}

const router = new Router();

router.get("/billing/monthly", async (ctx: Context) => {
  try {
    console.log("Handling /billing/monthly request");
    const data = await getTotalCostPerMonth();
    ctx.response.status = 200;
    ctx.response.body = data;
  } catch (error) {
    console.error("Request failed:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal Server Error" };
  }
});

export { router as gcpRoute };