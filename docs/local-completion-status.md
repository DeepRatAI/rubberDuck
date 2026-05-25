# RubberDuck Local Completion Status

This file tracks the local/autonomous completion gate against `to-complete.md`. It deliberately excludes provider-side actions that require DNS, production secrets, legal decisions, or live account configuration.

## Closed Locally

- CI workflow files, issue templates, PR template, code owners, contributor guide, security policy, self-hosting docs, deployment docs, incident runbook, rollback runbook, moderation runbook.
- Strict environment validation, i18n parity check, high-confidence secret scan, high-severity dependency audit, and local health endpoint.
- Real Drizzle schema/migrations/seed for users, profiles, posts, comments, courses, exercises, progress, RSS, notifications, reports, moderation, audit events, feed feedback, and impressions.
- Identity Hub editing, avatar/banner upload path, privacy settings, profile tabs, completed courses, saved owner view, dynamic metrics, people directory, follow state, and account export/delete.
- Binnacle rich posts with content types, Markdown/spoilers/code rendering, safe embeds, local media upload, Project Signals, comments, reporting, saving, sharing, edit/delete, and feed controls.
- Binnacle Help questions can now close a positive social loop by letting the post author mark replies as helpful, notify the answer author, and award a Helpful Answer badge.
- Home feed blend of Binnacle, RSS, and courses with ranking modes, impressions, more/less-like feedback, mute tag/source, RSS images, fallback covers, and an activation board with next-best-actions.
- Sharing supports standard social intents plus network-specific copy drafts for LinkedIn, X, and Reddit.
- Course Studio with sections, exercises, media library metadata, visualizations, notebook import preview/mapping, revision snapshots, autosave/publish, export, Pyodide execution, progress/completion telemetry, Thanks/Save/Share.
- Admin operations for reports, account enforcement, RSS health, and audit trail.
- Security hardening for Zod validation, session/admin gates, ownership checks, rate limits, sanitized Markdown, media allowlists, antiabuse heuristics, private reports, and audit events.
- Bilingual UI dictionary parity across English and Spanish.

## Provider / Manual Only

- Initialize/connect the final Git repository and push this workspace.
- Link Vercel project, set env vars, configure preview/production domains, and run live smoke.
- Point `rubberduck.net` DNS and update canonical URLs.
- Configure GitHub/Google OAuth callbacks for production.
- Configure Resend or SMTP only after the final domain is ready.
- Create R2 S3-compatible credentials, public/custom media URL, and CORS.
- Choose Neon backup/PITR policy and run migrations against production.
- Add Turnstile production domains and widgets to final launch forms if enforced.
- Finalize legal jurisdiction, minimum age, legal/moderation/appeals emails, and subprocessor list.
- Validate Sentry/PostHog production projects with real preview events and alerts.

## Recommended Launch Mode

Launch as an open beta after the provider/manual checklist in `docs/user-action-required.md` is complete. Full public launch should wait for production smoke, restore drill, real OAuth tests, observability alerts, and one manual accessibility/security pass.
