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
      // Assumes the first tunnel has the public_url property.
      return data.tunnels[0]?.public_url || "";
    } catch (error) {
      console.error("Error fetching ngrok URL:", error);
      return "";
    }
  }

export async function getNgrokUrl(): Promise<string> {
  if(!NGROK_TOKEN) return "";
    
    let url = "";
    try {
      url = new TextDecoder().decode(Deno.readFileSync("./.ngrok.env")).trim();
    } catch (_error) {
      console.error("Error reading .ngrok.env: IGNORE THIS IF RUNNING DEV_MODE IN A CONTAINER OUTSIDE OF VSCODE.");
    }
    // If no URL in file, fallback to using the fetch API.
    if (!url) {
      url = await getNgrokPublicUrl();
    }
    return url;
  }

