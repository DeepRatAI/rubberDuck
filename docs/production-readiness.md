# RubberDuck Production Readiness

This document is the operational truth for the current production-grade staging
posture. It complements `README.md`, `docs/deployment-config.md`, and
`docs/user-action-required.md`.

## Current Production Surface

- App host: Vercel.
- Staging production URL: `https://rubberduck-sand.vercel.app`.
- Database: Neon Postgres through `DATABASE_URL`.
- Media storage: Cloudflare R2 through `STORAGE_DRIVER=r2`.
- Rate limiting: Upstash Redis REST in production.
- Auth: GitHub and Google OAuth through NextAuth, with local credentials
  provider disabled outside local/test contexts.
- Observability: Sentry DSN and PostHog client analytics configured with
  privacy-conservative defaults.
- Scheduled jobs: Vercel Cron invokes `/api/rss/refresh` daily on Hobby.
- External content: curated English RSS feeds are bootstrapped by the refresh
  route and stored as normalized article rows with inherited images when safe.

## Production Gates

Run these before treating a branch or deployment as releaseable:

```bash
pnpm install --frozen-lockfile
pnpm env:check
pnpm format
pnpm lint
pnpm i18n:check
pnpm security:secrets
pnpm security:audit
pnpm typecheck
pnpm test
pnpm build
```

For user-flow changes, also run:

```bash
docker compose up -d db
pnpm db:migrate
pnpm db:seed
RUBBERDUCK_E2E_MODE=true pnpm test:e2e --project=chromium
```

For Vercel staging, verify:

```bash
curl -fsS https://rubberduck-sand.vercel.app/api/health
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://rubberduck-sand.vercel.app/api/rss/refresh
```

Do not seed demo users into public production. Seed only local/dev data or
intentional editorial starter content.

## Cron and RSS Hardening

Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is
present in project env vars. RubberDuck also supports manual operator refreshes
through `x-rubberduck-rss-secret` or `secret=` using `RSS_REFRESH_SECRET`.

The refresh route:

- uses Node.js runtime and forced dynamic execution;
- bootstraps the curated RSS source catalog idempotently;
- ignores feed/root URLs and stores specific article URLs only;
- rejects non-`http(s)` URLs;
- blocks server-side OpenGraph fetches to localhost and private-network IPs;
- limits concurrent OpenGraph enrichment work;
- reports source failure counts without exposing raw stack traces to users.

## Known External Dependencies

These items are not code gaps, but they must be resolved before final public
launch:

- final domain and DNS;
- OAuth callbacks for the final domain;
- Google OAuth consent status and allowed test users while in testing mode;
- GitHub Actions account/billing unlock so hosted runners can execute;
- Sentry source-map upload token if release source maps are desired;
- custom R2 media domain and final-domain CORS entries;
- transactional email provider after the final domain is verified.

## Release Invariants

- No dislikes, downvotes, or public rejection counters.
- Reports stay private.
- Write actions validate input and enforce authorization before mutation.
- Production env validation fails closed for missing auth, database, object
  storage, Redis rate limiting, observability, admin emails, or cron secret.
- Profile privacy is resolved server-side for public/followers/private fields.
- Course completion requires section views plus required exercise passes.
- Runnable Python cells execute in a browser worker through Pyodide; GPU work is
  intentionally delegated to Colab handoff until a managed runner exists.
