import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';

// Mock Neon and Anthropic so tests don't need real credentials
vi.mock('@neondatabase/serverless', () => ({
  neon: () => async () => [],
}));

vi.mock('../src/lib/ai', () => ({
  runSecurityAudit: async () => 'No issues found.',
}));

// Mock verifyToken so we can control its output
vi.mock('../src/lib/auth', () => ({
  verifyToken: async (token: string) => {
    if (token === 'valid-token') {
      return {
        id: 'user-123',
        email: 'test@example.com',
        token,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
    }
    throw new Error('Invalid token');
  },
}));

vi.mock('../src/lib/session', () => ({
  storeSession: async () => {},
}));

const mockEnv: Env = {
  JWT_SECRET: 'test-secret',
  DATABASE_URL: 'postgresql://test',
  AI: {} as Ai,
};

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('edge-auth-worker', () => {
  it('returns 401 when no Authorization header', async () => {
    const request = new IncomingRequest('http://example.com/');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const request = new IncomingRequest('http://example.com/', {
      headers: { Authorization: 'Bearer bad-token' },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it('returns 200 with user JSON for a valid token', async () => {
    const request = new IncomingRequest('http://example.com/', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const body = await response.json() as { id: string; email: string };
    expect(body.id).toBe('user-123');
    expect(body.email).toBe('test@example.com');
  });

  it('GET /audit returns AI security review', async () => {
    const request = new IncomingRequest('http://example.com/audit');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('No issues found.');
  });
});
