import { NGROK_TOKEN } from "../config/env.ts";

async function getNgrokPublicUrl(): Promise<string> {
    try {
      const response = await fetch("http://ngrok:4040/api/tunnels", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        console.error("Failed to fetch ngrok tunnels:", response.statusText);
        return "";
      }
      const data = await response.json();
      return data.tunnels[0]?.public_url || "";
    } catch (error) {
      console.error("Error fetching ngrok URL:", error);
      return "";
    }
  }

  export async function getNgrokUrl(): Promise<string | undefined> {
    if (!NGROK_TOKEN || NGROK_TOKEN.length === 0) return undefined;
  
    let url = "";
    try {
      const data = await Deno.readFile("./.ngrok.env");
      url = new TextDecoder().decode(data).trim();
    } catch (_error) {
      console.error("Error reading .ngrok.env: IGNORE THIS IF RUNNING DEV_MODE IN A CONTAINER OUTSIDE OF VSCODE.");
    }

    if (!url) url = await getNgrokPublicUrl();

    return url || undefined;
  }
