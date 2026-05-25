# Release and Rollback Runbook

## Pre-Release

1. Confirm CI is green.
2. Run local validation:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

3. Run migrations on a production branch/clone first when available.
4. Confirm `RUBBERDUCK_STRICT_ENV=true pnpm env:check` passes with production variables.
5. Confirm Sentry/PostHog receive test events in preview.
6. Smoke auth, onboarding, Binnacle post, media upload, Course Studio draft, course reader execution, report, save, Thanks, and RSS refresh.

## Release

1. Deploy preview.
2. Run preview smoke.
3. Promote to production.
4. Verify production:
   - landing
   - login
   - `/app`
   - `/binnacle`
   - `/courses`
   - `/settings/profile`
   - `/api/health`
5. Record release SHA, deploy URL, migration version, and time.

## Rollback

1. If code-only failure: rollback to previous Vercel deployment.
2. If schema failure: restore from Neon branch/PITR or apply documented forward-fix migration.
3. If media failure: switch `STORAGE_DRIVER` or R2 public URL only after confirming upload/read behavior.
4. If auth failure: disable affected provider and keep at least one working provider.

## Post-Incident

- Capture root cause.
- Add regression test.
- Add monitor or alert if the issue could recur.
