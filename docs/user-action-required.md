# RubberDuck External Setup Checklist

This file is the handoff for work that cannot be completed safely from the local repository alone. Everything here depends on provider accounts, production secrets, DNS, or legal/business decisions.

Do not paste secrets into issues, commits, screenshots, or public chat. Store them in Vercel environment variables, local `.env.local`, or the relevant provider secret manager.

## 1. GitHub Repository and CI

Status:

- In progress from the local workspace: this project is being initialized and pushed to `DeepRatAI/Dev4All`.

Required from you after the first push:

- Add the GitHub Actions secrets only if a workflow later needs deploy credentials. The current CI workflow uses no external secrets.
- Enable branch protection after CI is green:
  - require pull request before merge
  - require `quality` workflow job
  - require `e2e` workflow job before public launch
  - block force-pushes on the production branch

Current repo-side work:

- `.github/workflows/ci.yml` runs lint, i18n coverage, high-confidence secret scanning, typecheck, unit tests, high-severity dependency audit, build, migration/seed smoke, and Playwright E2E with artifacts.
- The intended production repository is `https://github.com/DeepRatAI/Dev4All`.

## 2. Vercel

Required from you:

- Create or link the Vercel project for RubberDuck.
- Set production and preview environment variables:
  - `APP_URL`
  - `NEXTAUTH_URL`
  - `AUTH_SECRET`
  - `NEXTAUTH_SECRET`
  - `DATABASE_URL`
  - `RUBBERDUCK_STRICT_ENV=true`
  - `RSS_REFRESH_SECRET`
  - `ADMIN_EMAILS`
  - provider-specific variables listed below
- Configure the build command as `pnpm build`.
- Configure the install command as `pnpm install --frozen-lockfile`.
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
```

Repo-side support now available:

- `/admin/rss` shows admin-only RSS source health, stored article counts, latest article timestamps, and stale-source summary.
- `/admin` provides the local operational control plane for reports, user enforcement, RSS health, and audit trail.
- `/admin/audit` exposes recent sensitive administrative events for review.

## 3. Domain and DNS

Required from you:

- Point `rubberduck.net` and `www.rubberduck.net` to Vercel.
- Set `APP_URL=https://rubberduck.net` and `NEXTAUTH_URL=https://rubberduck.net`.
- Decide whether `www` redirects to apex or apex redirects to `www`; recommendation: apex canonical, `www` redirect.

## 4. Neon Postgres

Required from you:

- Store the pooled Neon connection string in Vercel as `DATABASE_URL`.
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

- Create R2 S3-compatible credentials, not only a Cloudflare API token.
- Store in Vercel:
  - `STORAGE_DRIVER=r2`
  - `R2_ACCOUNT_ID`
  - `R2_BUCKET`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_PUBLIC_BASE_URL`
- Enable a public development URL or configure a final media domain.
- Add CORS for:
  - `https://rubberduck.net`
  - `https://www.rubberduck.net`
  - `https://*.vercel.app`
  - `http://localhost:3000`

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

## 6. OAuth and Email Auth

Required from you:

- GitHub OAuth callback:
  - local: `http://localhost:3000/api/auth/callback/github`
  - production: `https://rubberduck.net/api/auth/callback/github`
- Google OAuth callback:
  - local: `http://localhost:3000/api/auth/callback/google`
  - production: `https://rubberduck.net/api/auth/callback/google`
- Store credentials:
  - `GITHUB_ID`
  - `GITHUB_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

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

- Store PostHog:
  - `NEXT_PUBLIC_POSTHOG_TOKEN`
  - `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`
- Store Sentry:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN` only in CI/Vercel if source map upload is desired
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
