import { Pool } from "pg";
import { decryptIfConfigured, encryptIfConfigured } from "./encryption.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface QboConnection {
  id: string;
  user_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: Date;
}

/**
 * Get the QBO connection for a user. Decrypts access_token and refresh_token when ENCRYPTION_KEY is set.
 */
export async function getConnectionForUser(userId: string): Promise<QboConnection | null> {
  const result = await pool.query<QboConnection>(
    `select id, user_id, realm_id, access_token, refresh_token, token_expires_at
     from qbo_connections where user_id = $1`,
    [userId]
  );
  const row = result.rows[0] ?? null;
  if (!row) return null;
  return {
    ...row,
    access_token: decryptIfConfigured(row.access_token),
    refresh_token: decryptIfConfigured(row.refresh_token),
  };
}

/**
 * Upsert QBO tokens after OAuth callback or token refresh. Encrypts tokens when ENCRYPTION_KEY is set.
 */
export async function upsertConnection(
  userId: string,
  realmId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  const accessEnc = encryptIfConfigured(accessToken);
  const refreshEnc = encryptIfConfigured(refreshToken);
  await pool.query(
    `insert into qbo_connections (user_id, realm_id, access_token, refresh_token, token_expires_at, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (user_id) do update set
       realm_id = excluded.realm_id,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at,
       updated_at = now()`,
    [userId, realmId, accessEnc, refreshEnc, expiresAt]
  );
}

/**
 * Get or create user by email (e.g. from OAuth or session).
 */
export async function getOrCreateUser(email: string): Promise<{ id: string }> {
  const existing = await pool.query<{ id: string }>("select id from users where email = $1", [
    email,
  ]);
  if (existing.rows[0]) return existing.rows[0];
  const inserted = await pool.query<{ id: string }>(
    "insert into users (email) values ($1) returning id",
    [email]
  );
  return inserted.rows[0];
}
