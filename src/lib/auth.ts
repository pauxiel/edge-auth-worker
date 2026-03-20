import jwt from '@tsndr/cloudflare-worker-jwt';
import type { User } from '../types';

export async function verifyToken(token: string, secret: string): Promise<User> {
  const isValid = await jwt.verify(token, secret);
  if (!isValid) {
    throw new Error('Invalid or expired token');
  }

  const decoded = jwt.decode(token);
  const payload = decoded.payload as Record<string, unknown>;

  return {
    id: payload.sub as string,
    email: payload.email as string,
    token,
    expiresAt: new Date((payload.exp as number) * 1000).toISOString(),
  };
}
