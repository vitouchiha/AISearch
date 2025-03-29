import { neon } from "./deps.ts";
import { DB_URL_PRIMARY, DB_URL_REPLICAS } from './env.ts';

export const sqlPrimary = neon(DB_URL_PRIMARY);

const replicaUrls = DB_URL_REPLICAS.split(',');
export const sqlReplicas = replicaUrls.map(url => neon(url));

let replicaIndex = 0;
const getReplica = () => {
  const replica = sqlReplicas[replicaIndex];
  replicaIndex = (replicaIndex + 1) % sqlReplicas.length;
  return replica;
};

export const saveEncryptedKeys = async (userId: string, encrypted: string) => {
  await sqlPrimary`
    INSERT INTO user_keys (user_id, encrypted_keys)
    VALUES (${userId}, ${encrypted})
    ON CONFLICT (user_id)
    DO UPDATE SET encrypted_keys = ${encrypted}, updated_at = NOW();
  `;
};

export const getEncryptedKeys = async (userId: string): Promise<string | null> => {
  const sqlReplica = getReplica();
  const result = await sqlReplica`
    SELECT encrypted_keys FROM user_keys WHERE user_id = ${userId} LIMIT 1
  `;
  return result[0]?.encrypted_keys ?? null;
};

export async function initDatabase() {
    try {
      await sqlPrimary`
        CREATE TABLE IF NOT EXISTS user_keys (
          user_id UUID PRIMARY KEY,
          encrypted_keys TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;
      console.log("[initDb] ✅      user_keys table is ready.");
    } catch (error) {
      console.error("[initDb] ❌    Failed to initialize database:", error);
      throw error;
    }
  }