import type { Env } from './types';
import { verifyToken } from './lib/auth';
import { storeSession } from './lib/session';
import { runSecurityAudit } from './lib/ai';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // GET /audit — run AI security review of this auth implementation
    if (url.pathname === '/audit' && request.method === 'GET') {
      const audit = await runSecurityAudit(env.AI);
      return new Response(audit, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // All other routes require a valid Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    let user;
    try {
      user = await verifyToken(token, env.JWT_SECRET);
    } catch {
      return new Response('Unauthorized', { status: 401 });
    }

    await storeSession(env.DATABASE_URL, user);

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
} satisfies ExportedHandler<Env>;
