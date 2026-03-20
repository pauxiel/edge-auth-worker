export interface Env {
  JWT_SECRET: string;
  DATABASE_URL: string;
  AI: Ai;
}

export interface User {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
}
