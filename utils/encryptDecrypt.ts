import { Buffer, randomBytes, createCipheriv, createDecipheriv } from "../config/deps.ts";
import type { Keys } from "../config/types/types.ts";
import { ENCRYPTION_KEY } from "../config/env.ts";
import { logError } from "./utils.ts";

const IV_LENGTH = 16;

// Encrypt keys for Redis storage
export function encryptKeys(keys: Keys): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
    let encrypted = cipher.update(JSON.stringify(keys), "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }
  
  // Decrypt keys from Redis
  export function decryptKeys(encrypted: string) {
    if (!encrypted.includes(":")) {
      throw new Error("Invalid encrypted string format");
    }
    
    const [ivHex, encryptedHex] = encrypted.split(":");
    try {
      const iv = Buffer.from(ivHex, "hex");
      const decipher = createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv);
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted) as Keys;
    } catch (error) {
      // Log error or handle accordingly
      logError("Decryption failed ", error);
    }
  }