# Security Policy

## Supported Version

RubberDuck is currently pre-1.0. Security fixes target the active mainline branch.

## Reporting a Vulnerability

Use the private security channel configured by the project owner before public launch. Until a final address is configured, do not disclose exploitable details publicly.

Required report details:

- Affected route, API, server action, or component.
- Reproduction steps.
- Impact.
- Whether authentication is required.
- Any payloads or files needed to reproduce.

## Security Boundaries

RubberDuck treats these as untrusted:

- User profiles, posts, comments, Project Signals, course drafts, notebooks, uploaded media, embeds, URLs, RSS feeds, OAuth profile data, and code cell output.

Current controls:

- Server-side Zod validation for mutations.
- Sanitized Markdown rendering.
- Private reports and no public negative counters.
- Rate limits for write-heavy actions.
- Antiabuse heuristics for unsafe markup, URL stuffing, repeated links, and suspicious shortener clusters.
- CSP and security headers.
- Local-first Pyodide execution for MVP Python cells.
- Production strict environment checks.
- CI secret scanning and high-severity dependency audit scripts.
- Admin-only report queue, account enforcement, RSS health, and audit trail.

Known launch hardening still required:

- Production OAuth smoke tests.
- R2 upload hardening and lifecycle cleanup.
- Manual OWASP-style review of auth/session, XSS, SSRF, IDOR, uploads, markdown, embeds, RSS, and server actions.
- Final security contact email.

See `docs/security-review.md` for the current local security review matrix.
