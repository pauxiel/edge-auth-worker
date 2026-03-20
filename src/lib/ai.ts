const authCode = `
// auth.ts — verifyToken
import jwt from '@tsndr/cloudflare-worker-jwt';

export async function verifyToken(token, secret) {
  const isValid = await jwt.verify(token, secret);
  if (!isValid) throw new Error('Invalid or expired token');
  const decoded = jwt.decode(token);
  const payload = decoded.payload;
  return {
    id: payload.sub,
    email: payload.email,
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

// session.ts — storeSession / getSession
import { neon } from '@neondatabase/serverless';

export async function storeSession(databaseUrl, user) {
  const sql = neon(databaseUrl);
  await sql\`INSERT INTO sessions (user_id, email, token, expires_at)
             VALUES (\${user.id}, \${user.email}, \${user.token}, \${user.expiresAt})\`;
}

export async function getSession(databaseUrl, token) {
  const sql = neon(databaseUrl);
  const rows = await sql\`
    SELECT user_id, email, token, expires_at FROM sessions
    WHERE token = \${token} AND expires_at > NOW() LIMIT 1\`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return { id: row.user_id, email: row.email, token: row.token, expiresAt: row.expires_at };
}
`;

export async function runSecurityAudit(ai: Ai): Promise<string> {
  const response = await ai.run(
    '@cf/meta/llama-3.1-8b-instruct' as keyof AiModels,
    {
      prompt: `Review this Cloudflare Worker auth implementation for security vulnerabilities. Be concise — list only real issues with suggested fixes:\n\n${authCode}`,
    }
  ) as { response?: string };

  return response.response ?? '';
}
