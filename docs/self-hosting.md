# Self-Hosting RubberDuck

RubberDuck is designed as local-first and cloud-ready. The production default path is Vercel + Neon + Cloudflare R2, but local Docker Postgres remains the deterministic development path.

## Minimum Local Stack

- Node.js 20+
- pnpm
- Docker
- PostgreSQL through `docker compose`

```bash
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Required Production Services

- PostgreSQL database.
- Object storage for uploaded media.
- OAuth or email provider.
- Distributed rate limit store.
- Error monitoring.
- Product analytics if enabled by launch policy.

## Environment

Start from `.env.example` and read `docs/deployment-config.md`.

Production should set:

```bash
RUBBERDUCK_STRICT_ENV=true
APP_URL=https://your-domain.example
NEXTAUTH_URL=https://your-domain.example
STORAGE_DRIVER=r2
```

Run:

```bash
RUBBERDUCK_STRICT_ENV=true pnpm env:check
```

## Data

Do not seed demo data into production unless explicitly converting it into editorial starter content. Keep local seed data separate from public launch data.

## Runtime Execution

The MVP execution engine is browser-side Pyodide. Heavy CPU/GPU, networked, or untrusted workloads require a separate managed execution service before public exposure.
