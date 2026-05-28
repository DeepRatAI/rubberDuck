# Deployment and Provider Configuration

This project is local-first and cloud-ready. Secrets must live in `.env.local` for local development and in Vercel environment variables for preview/production.

## Environment Names

The app accepts canonical names and common provider aliases:

- `APP_URL` or `NEXTAUTH_URL`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `RUBBERDUCK_STRICT_ENV` (`DEVIT_STRICT_ENV` remains accepted as a backwards-compatible alias)
- `RUBBERDUCK_E2E_MODE` (localhost-only Playwright mode; never set in preview/production)
- `GITHUB_ID`, `GITHUB_SECRET`
- `GITHUB_TOKEN` (optional Project Signal API enrichment token)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `CRON_SECRET` (Vercel Cron sends this as `Authorization: Bearer $CRON_SECRET`)
- `RSS_REFRESH_SECRET` (manual/operator refresh secret; may match `CRON_SECRET`)
- `NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `STORAGE_DRIVER`
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- `ADMIN_EMAILS`

For deploy checks, set `RUBBERDUCK_STRICT_ENV=true`. In production runtime, strict checks are enabled by default. Local production builds stay possible without real provider credentials unless strict mode is explicitly enabled.

`RUBBERDUCK_E2E_MODE=true` exists only so Playwright can test `next start` against `http://localhost:3000` with the guarded local identity provider. The env parser rejects this mode when `APP_URL`/`NEXTAUTH_URL` is not localhost or `127.0.0.1`.

## Neon Postgres

Use the pooled Neon connection string for Vercel/serverless environments when concurrency grows. The standard connection string is fine for local migration and seed commands.

Local:

```bash
DATABASE_URL="postgresql://..."
pnpm db:migrate
pnpm db:seed
```

Production/preview:

- Store `DATABASE_URL` in Vercel environment variables.
- Run migrations before production traffic depends on a new schema.
- Keep local Docker Postgres as the deterministic offline path.

## Cloudflare R2

The current production storage driver is `r2`, implemented through Cloudflare R2's S3-compatible API.

Required app variables:

```bash
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_BUCKET=dev4all
R2_ACCESS_KEY_ID=<r2-s3-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-s3-secret-access-key>
R2_PUBLIC_BASE_URL=<public-development-url-or-custom-domain>
```

Important: a normal Cloudflare API token is not the same as an R2 S3 Access Key ID plus Secret Access Key. Create these from Cloudflare R2 > Manage API tokens > Create Account/User API token, copy the S3 credentials, and store them as the `R2_*` variables above.

Until a final domain exists, enable the bucket Public Development URL if uploaded course images/videos must render directly in the browser. For production, use a custom media domain and set `R2_PUBLIC_BASE_URL` to that domain.

Recommended CORS policy for direct browser reads from local and preview domains:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://*.vercel.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## PostHog

Client analytics are initialized through `src/instrumentation-client.ts` when `NEXT_PUBLIC_POSTHOG_TOKEN` is present. The default host is `https://us.i.posthog.com`.

The current client configuration is privacy-conservative: page views are enabled, autocapture and session recording are disabled, DNT is respected, and PostHog person profiles are created only for identified users.

## Sentry

Sentry is wired through the official Next.js SDK:

- `src/instrumentation.ts` registers server and edge configs.
- `src/instrumentation-client.ts` initializes browser error monitoring when `NEXT_PUBLIC_SENTRY_DSN` is present.
- `next.config.ts` wraps the app with `withSentryConfig`.

Privacy defaults:

- `sendDefaultPii=false`
- low trace sample rates
- no browser session replay by default
- source map upload only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are configured in CI/deploy environments

## Rate Limiting

Write actions and uploads call `src/server/rate-limit.ts`.

- Local/test development uses an in-memory limiter.
- Preview/production should set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for distributed limits across serverless instances.
- Strict production env validation requires Upstash credentials so write protection does not silently degrade to per-instance memory.

Current protected buckets include onboarding, profile update, post create/update/delete, Binnacle media upload, comment create/update/delete, reports, follows, interest/save actions, course draft autosave, course media upload, course Thanks, and course saves.

## Security Headers

`next.config.ts` applies global security headers:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`

The CSP allows RubberDuck app assets, configured R2 media, PostHog, Sentry ingest endpoints, Turnstile, YouTube/Vimeo embeds, Colab handoff frames, Workers/Pyodide blobs, and development-only `unsafe-eval`.

## Cloudflare Turnstile

`src/lib/turnstile.ts` implements server-side verification against Cloudflare Siteverify. In non-production without a secret it returns a skipped success so local development is not blocked. In production, missing Turnstile configuration fails closed.

The widget can be enabled on abuse-sensitive forms after the product flows are fully wired:

- sign-up/sign-in entry points
- Binnacle post composer
- comment composer
- report form

Use a localhost Turnstile domain for local testing and add the final production domain before launch.

## Resend / Email

Resend can wait until the final domain exists. Before public launch, configure:

- verified sending domain
- `EMAIL_SERVER`
- `EMAIL_FROM`
- transactional templates for magic links, notifications, and moderation/admin messages

## Vercel

Recommended flow:

```bash
vercel link
vercel env add DATABASE_URL production preview development
vercel env add AUTH_SECRET production preview development
vercel env add APP_URL production preview development
vercel env add RUBBERDUCK_STRICT_ENV production preview
```

Add all provider secrets in the Vercel dashboard or through `vercel env add --sensitive`. Pull local values with:

```bash
vercel env pull .env.local --yes
```

Do not commit `.env.local`.

### RSS Cron

`vercel.json` registers a daily Hobby-compatible cron for `/api/rss/refresh`.
Vercel invokes cron paths with `GET` against the production deployment. When
`CRON_SECRET` is set in Vercel, Vercel automatically sends
`Authorization: Bearer $CRON_SECRET`; the endpoint also accepts
`x-rubberduck-rss-secret` or `secret=` with `RSS_REFRESH_SECRET` for manual
operator refreshes.

The route is forced dynamic and Node.js runtime because RSS parsing, OpenGraph
fetching, and SSRF protections are server-side work. Source parsing is
concurrent, OpenGraph image enrichment is concurrency-limited, and article URLs
must be specific `http(s)` URLs. Localhost and private-network fetch targets are
rejected before server-side OpenGraph requests.
