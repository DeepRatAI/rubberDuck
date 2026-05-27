# RubberDuck External Setup Checklist

This file is the handoff for work that cannot be completed safely from the local repository alone. Everything here depends on provider accounts, production secrets, DNS, or legal/business decisions.

Do not paste secrets into issues, commits, screenshots, or public chat. Store them in Vercel environment variables, local `.env.local`, or the relevant provider secret manager.

## 1. GitHub Repository and CI

Status:

- Complete: the local project was initialized as Git repo and pushed to `https://github.com/DeepRatAI/rubberDuck` on branch `main`.

Required from you before CI can become green:

- Resolve the GitHub billing/account lock. The first CI run failed before starting a runner with this GitHub annotation: "The job was not started because your account is locked due to a billing issue."
- Add the GitHub Actions secrets only if a workflow later needs deploy credentials. The current CI workflow uses no external secrets.
- Enable branch protection after CI is green:
  - require pull request before merge
  - require `quality` workflow job
  - require `e2e` workflow job before public launch
  - block force-pushes on the production branch

Current repo-side work:

- `.github/workflows/ci.yml` runs lint, i18n coverage, high-confidence secret scanning, typecheck, unit tests, high-severity dependency audit, build, migration/seed smoke, and Playwright E2E with artifacts.
- The intended production repository is `https://github.com/DeepRatAI/rubberDuck`.

## 2. Vercel

Required from you:

- Complete: `../credenciales.txt` contains a usable Vercel token with access to team `team_lc362xI8Nuaw39A4V0eQCZbU` (`gonzalo-romero-deeprats-projects`).
- Complete: Vercel project `gonzalo-romero-deeprats-projects/rubberduck` is created, linked locally, and configured as a Next.js project with `pnpm install --frozen-lockfile` and `pnpm build`.
- Complete: Vercel project is connected to GitHub repository `DeepRatAI/rubberDuck` with production branch `main`.
- Complete: production and preview environment variables were synced from `../credenciales.txt` with `pnpm vercel:env:sync`.
- Complete: build command is `pnpm build`.
- Complete: install command is `pnpm install --frozen-lockfile`.
- Add a Vercel Cron for RSS refresh after the production URL exists:
  - path: `/api/rss/refresh`
  - secret: `CRON_SECRET` or `RSS_REFRESH_SECRET`
  - cadence: every 60 minutes through `vercel.json`

Repo-side support now available:

- `vercel.json` defines an hourly RSS refresh cron for `/api/rss/refresh`.
- The RSS refresh endpoint accepts Vercel Cron's `Authorization: Bearer $CRON_SECRET` header, plus the existing RubberDuck header/query secret paths.

Validation command after Vercel envs exist:

```bash
RUBBERDUCK_STRICT_ENV=true pnpm env:check
pnpm vercel:env:sync
```

Repo-side support now available:

- `/admin/rss` shows admin-only RSS source health, stored article counts, latest article timestamps, and stale-source summary.
- `/admin` provides the local operational control plane for reports, user enforcement, RSS health, and audit trail.
- `/admin/audit` exposes recent sensitive administrative events for review.

Current local secret-source state:

- `../credenciales.txt` currently contains the deployment secret source for staging: GitHub/Vercel tokens, app URLs, Auth secrets, pooled Neon `DATABASE_URL`, admin emails, GitHub/Google OAuth credentials, Redis, PostHog, Sentry DSN, and R2 credentials.
- `pnpm vercel:env:sync` has synced the required keys to Vercel without printing secret values.
- Do not commit `../credenciales.txt`.

## 3. Domain and DNS

Required from you:

- Confirm that you own `rubberduck.net`, or choose a different domain. Vercel domain availability reports `rubberduck.net` is not available for purchase.
- Point `rubberduck.net` and `www.rubberduck.net` to Vercel.
- Set `APP_URL=https://rubberduck.net` and `NEXTAUTH_URL=https://rubberduck.net`.
- Decide whether `www` redirects to apex or apex redirects to `www`; recommendation: apex canonical, `www` redirect.

## 4. Neon Postgres

Required from you:

- Complete: pooled Neon connection string is stored in Vercel as `DATABASE_URL`.
- Keep the direct connection string available locally for migrations if needed.
- Decide backup posture:
  - beta: Neon branching before schema migrations
  - public launch: paid PITR/history window and documented restore drill

Operational commands:

```bash
pnpm db:migrate
pnpm db:seed # only for local/dev or explicit editorial seed, never blind production demo data
```

Production rule:

- Do not seed demo identities into production.
- Run migrations before deploying code that depends on new schema.

## 5. Cloudflare R2

Required from you:

- Complete: R2 S3-compatible credentials are stored in Vercel.
- Complete: R2 public development URL is stored as `R2_PUBLIC_BASE_URL`.
- Complete for staging/local: CORS allows `https://rubberduck-sand.vercel.app` and `http://localhost:3000`.
- Still required after final domain: add `https://rubberduck.net` and `https://www.rubberduck.net` to R2 CORS.

Recommended read CORS:

```json
[
  {
    "AllowedOrigins": [
      "https://rubberduck.net",
      "https://www.rubberduck.net",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Local secret file format for Vercel sync:

Add these as `KEY=value` lines to `../credenciales.txt` or another local file passed with `RUBBERDUCK_CREDENTIALS_FILE=/path/to/file`. Do not commit that file.

```bash
VERCEL_TOKEN=...
DATABASE_URL=...
AUTH_SECRET=...
NEXTAUTH_SECRET=...
CRON_SECRET=...
RSS_REFRESH_SECRET=...
ADMIN_EMAILS=...
GITHUB_ID=...
GITHUB_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_POSTHOG_TOKEN=...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_DSN=...
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=...
R2_BUCKET=dev4all
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE_URL=...
```

Then run:

```bash
pnpm vercel:env:sync
```

## 6. OAuth and Email Auth

Required from you:

- GitHub OAuth callback:
  - staging: `https://rubberduck-sand.vercel.app/api/auth/callback/github`
  - local optional: `http://localhost:3000/api/auth/callback/github`
  - production after DNS: `https://rubberduck.net/api/auth/callback/github`
- Google OAuth callback:
  - staging: `https://rubberduck-sand.vercel.app/api/auth/callback/google`
  - local optional: `http://localhost:3000/api/auth/callback/google`
  - production after DNS: `https://rubberduck.net/api/auth/callback/google`
- Complete: `GITHUB_ID`, `GITHUB_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` are stored in Vercel.

Email login recommendation:

- Keep email login disabled until the domain is final.
- Configure Resend or another SMTP provider after DNS is ready:
  - `EMAIL_SERVER`
  - `EMAIL_FROM`

## 7. Turnstile

Required from you:

- Add production domains to the Turnstile widget:
  - `rubberduck.net`
  - `www.rubberduck.net`
  - Vercel preview domains if desired
- Store:
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`

Production posture:

- Missing Turnstile should fail closed only once the widgets are attached to the relevant forms.
- Local development can continue without Turnstile.

## 8. Observability

Required from you:

- Complete: PostHog `NEXT_PUBLIC_POSTHOG_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` are stored in Vercel.
- Complete: Sentry `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` are stored in Vercel.
- Deferred until paid/needed: Vercel log/trace drains to Sentry.
- Optional later for source map upload:
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`
- Configure alerts:
  - elevated server error rate
  - failed sign-in spikes
  - RSS refresh failures
  - upload failures
  - course execution telemetry failures

## 9. Legal Decisions

Required from you before public launch:

- Final jurisdiction.
- Final minimum age.
- Legal contact email.
- Moderation contact email.
- Appeals contact email.
- Subprocessor list confirmation:
  - Vercel
  - Neon
  - Cloudflare
  - Sentry
  - PostHog
  - OAuth providers
  - email provider when enabled

Current recommendation:

- Launch as invite/open beta first.
- Use the legal pages in the app as operational drafts until reviewed by counsel.
- Minimum age default: 13+ unless jurisdiction or product strategy requires a higher bar.

## 10. Launch Mode

Decision needed:

- Private beta: safest for early feedback and moderation tuning.
- Open beta: recommended if CI, auth, R2, observability, legal pages, and moderation queue are complete.
- Full public launch: only after production smoke, restore drill, abuse controls, and security review pass.

Recommended path:

1. Open beta on Vercel with real auth and observability.
2. Keep email login optional until domain mail is verified.
3. Enable public RSS refresh cron.
4. Run a security/accessibility/performance gate before announcing broadly.
