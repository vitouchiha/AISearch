import { Context, Router, create } from "../config/deps.ts";
import { GCP_BILLING_ACCOUNT_ID } from "../config/env.ts";

// Work in progress.

async function getGoogleAuthToken() {
    const credentials = JSON.parse(Deno.env.get("GCP_SERVICE_ACCOUNT")!);
    const scope = "https://www.googleapis.com/auth/cloud-platform";

    const payload = {
        iss: credentials.client_email,
        aud: "https://oauth2.googleapis.com/token",
        scope: scope,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, 
    };

    const token = await create(
        { alg: "RS256", typ: "JWT" }, 
        payload,
        credentials.private_key 
    );

    // Exchange JWT for OAuth token
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: token,
        }),
    });

    const result = await response.json();
    return result.access_token;
}

async function fetchGcpBillingData() {
    const response = await fetch(
        `https://billingbudgets.googleapis.com/v1/billingAccounts/${GCP_BILLING_ACCOUNT_ID}/budgets`,
        {
            headers: {
                Authorization: `Bearer ${await getGoogleAuthToken()}`,
            },
        }
    );
    return await response.json();
}


const router = new Router();

router.get("/billing", async (ctx: Context) => {

    // secure using a jwt token..

    const billingData = await fetchGcpBillingData();
    ctx.response.body = { monthlyCost: billingData };
});