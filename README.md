# edge-auth-worker

JWT authentication at the edge using Cloudflare Workers, Neon Postgres, and Cloudflare Worker AI. No cold starts. No Lambda. No JWKS round trips.

## What it does

- Verifies JWT tokens at the edge using [`@tsndr/cloudflare-worker-jwt`](https://github.com/tsndr/cloudflare-worker-jwt) — zero dependencies, built specifically for Workers
- Stores sessions in [Neon](https://neon.tech) serverless Postgres via HTTP (no connection pooling needed)
- Runs an AI security audit of the auth implementation on demand via Cloudflare Worker AI (no API key required)

## Deploy your own in one command

```bash
npx create-cloudflare@latest my-auth-worker --template pauxiel/edge-auth-worker
```

Then add your secrets:

```bash
cd my-auth-worker
npx wrangler secret put JWT_SECRET      # openssl rand -base64 32
npx wrangler secret put DATABASE_URL    # from neon.tech
npx wrangler deploy
```

That's it.

## Manual setup

### 1. Clone and install

```bash
git clone https://github.com/pauxiel/edge-auth-worker
cd edge-auth-worker
npm install
```

### 2. Create Neon database

Go to [neon.tech](https://neon.tech) → create free account → create database named `edge-auth` → run:

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Copy the `DATABASE_URL` connection string.

### 3. Add secrets

```bash
npx wrangler secret put JWT_SECRET    # paste output of: openssl rand -base64 32
npx wrangler secret put DATABASE_URL  # paste your Neon connection string
```

### 4. Deploy

```bash
npx wrangler deploy
```

## API

### `POST /` — Verify token and store session

```bash
curl https://your-worker.workers.dev \
  -H "Authorization: Bearer <your-jwt>"
```

Returns `200` with user JSON on success, `401` on invalid/missing token.

### `GET /audit` — AI security review

```bash
curl https://your-worker.workers.dev/audit
```

Runs the auth implementation through Cloudflare Worker AI (Llama 3.1) and returns a security review. No API key needed.

## Project structure

```
src/
├── index.ts        # Worker entry point — routing + auth flow
├── types.ts        # Env + User interfaces
└── lib/
    ├── auth.ts     # JWT verification via @tsndr/cloudflare-worker-jwt
    ├── session.ts  # Neon session storage + retrieval
    └── ai.ts       # Worker AI security audit
```

## Tech

| | |
|---|---|
| Runtime | Cloudflare Workers |
| JWT | [@tsndr/cloudflare-worker-jwt](https://github.com/tsndr/cloudflare-worker-jwt) |
| Database | [Neon](https://neon.tech) serverless Postgres |
| AI | Cloudflare Worker AI — `@cf/meta/llama-3.1-8b-instruct` |

## License

MIT
