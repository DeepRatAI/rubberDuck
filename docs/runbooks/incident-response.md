# Incident Response Runbook

## Severity

- SEV1: Data leak, auth bypass, production outage, destructive data loss, malware distribution.
- SEV2: Major feature unavailable, RSS/feed broken, media uploads failing, course execution failing broadly.
- SEV3: Partial degradation, isolated UI bug, non-critical provider issue.

## First 15 Minutes

1. Identify scope: affected users, routes, providers, start time.
2. Check Sentry, Vercel logs, database health, R2 health, and recent deploys.
3. Freeze risky deploys.
4. If user data may be exposed, preserve logs and avoid destructive cleanup.
5. Decide rollback vs forward fix.

## Communication

Before public launch, keep incidents internal. After public launch, prepare:

- Status summary.
- Affected features.
- User impact.
- Mitigation.
- Next update time.

## Evidence to Preserve

- Release SHA and deployment ID.
- Error IDs/traces.
- Relevant audit events.
- Database migration version.
- Provider status pages.
- Screenshots or HAR files if a UI issue.

## Closure

- Root cause.
- Fix.
- Regression test.
- Monitoring improvement.
- Documentation update.
