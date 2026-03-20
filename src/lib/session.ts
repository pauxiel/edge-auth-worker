import { neon } from '@neondatabase/serverless';
import type { User } from '../types';

export async function storeSession(databaseUrl: string, user: User): Promise<void> {
  const sql = neon(databaseUrl);
  await sql`
    INSERT INTO sessions (user_id, email, token, expires_at)
    VALUES (${user.id}, ${user.email}, ${user.token}, ${user.expiresAt})
  `;
}

export async function getSession(databaseUrl: string, token: string): Promise<User | null> {
  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT user_id, email, token, expires_at
    FROM sessions
    WHERE token = ${token} AND expires_at > NOW()
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.user_id as string,
    email: row.email as string,
    token: row.token as string,
    expiresAt: row.expires_at as string,
  };
}
