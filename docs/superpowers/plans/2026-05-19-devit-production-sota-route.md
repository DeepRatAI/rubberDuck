# RubberDuck Production SOTA Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take RubberDuck from local-first MVP to public-launch production quality with no known critical product, security, UX, or operational gaps.

**Architecture:** Execute in release gates. Each gate must leave the app usable, migrated, tested, and documented before moving to the next gate. Production launch is blocked until auth, data integrity, Course Studio, social safety, media/RSS, observability, security, accessibility, performance, and deployment checks pass together.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, Drizzle, PostgreSQL/Neon, Auth.js/NextAuth, Pyodide, Playwright, Vitest, Vercel, R2-compatible storage, PostHog/Sentry-ready observability.

---

## Cross-Gate Product Identity Update

**Files:**

- Modify: `src/lib/brand.ts`
- Modify: visible app shell, landing, login, course, profile, settings, and docs copy
- Add: `public/rubberducklogo.png`
- Add: `public/rubberduck-icon.png`
- Add: `public/rubberduck-circuit-board.svg`

- [x] Rename product-facing brand from devit to RubberDuck.
- [x] Add the RubberDuck logo and replace the generic app mark.
- [x] Preserve the existing cyber-steampunk visual system while adding warmer duck/amber brand cues.
- [x] Update public metadata, primary copy, README, legal docs, runtime docs, and visible tests.
- [x] Fix obvious low-contrast text in courses, profile, settings, notifications, language toggle, and course reader surfaces.
- [x] Validate with lint, typecheck, tests, build, route smoke, and browser screenshots.

## Gate 1: Production Auth, Onboarding, And Route Protection

**Files:**

- Modify: `src/lib/auth.ts`
- Modify: `src/lib/env.ts`
- Modify: `src/server/current-user.ts`
- Modify: protected `src/app/**/page.tsx` files
- Create: `src/app/login/page.tsx`
- Create: `src/components/login-surface.tsx`
- Test: `src/lib/env.test.ts`

- [x] Add explicit login surface for GitHub, Google, and local dev login.
- [x] Move NextAuth `pages.signIn` from `/app` to `/login`.
- [x] Add helpers for optional user, required user, and onboarded user route guards.
- [x] Redirect anonymous production users to `/login?next=...` instead of throwing server errors.
- [x] Redirect authenticated incomplete users to `/onboarding`.
- [x] Redirect completed users away from `/onboarding` to `/app`.
- [x] Ensure local dev fallback never exists in production.
- [x] Validate with lint, typecheck, build, and auth-route smoke checks.

## Gate 2: Course Studio Completion

**Files:**

- Modify: `src/components/course-editor.tsx`
- Modify: `src/components/course-reader.tsx`
- Modify: `src/components/course-runner.tsx`
- Modify: `src/lib/course-studio.ts`
- Modify: `src/lib/notebook-export.ts`
- Modify: `src/server/repositories/courses.ts`
- Test: existing course studio, runner, export, and E2E specs

- [x] Add interactive Course Studio walkthrough and contextual tooltips.
- [x] Make authoring modes explicit: Compose, Notebook, Media, Review, Publish.
- [x] Make Jupyter/Colab affordances obvious in import/export UI.
- [x] Add revision compare and restore affordances.
- [x] Verify draft/publish ownership and no accidental overwrite.
- [x] Validate complex Pyodide execution with deterministic smoke exercises.
- [x] Preserve exportable `.ipynb` metadata and runnable exercise cells.
- [x] Align Course Studio with RubberDuck cyber-steampunk product identity.

## Gate 3: Social Core And Moderation

**Files:**

- Modify: `src/db/schema.ts`
- Modify: `src/server/repositories/feed.ts`
- Modify: `src/server/repositories/comments.ts`
- Modify: `src/server/repositories/mutations.ts`
- Modify: `src/components/feed.tsx`
- Modify: `src/app/binnacle/[postId]/page.tsx`
- Add admin-ready moderation surfaces after data contracts stabilize.

- [x] Finish edit flows for posts/comments with ownership checks.
- [x] Add admin moderation queue for reports.
- [x] Add hidden/restored states and audit event model.
- [x] Add notification events for replies, follows, Thanks, and creator/student course loops.
- [x] Add pagination/infinite loading for feed and RSS.
- [x] Add saved-content surfaces.

## Gate 4: Media, RSS, And Discovery Pipeline

**Files:**

- Modify: `src/app/api/rss/refresh/route.ts`
- Modify: `src/lib/rss-sources.ts`
- Modify: media storage adapters
- Add scheduled refresh/deployment docs

- [x] Move RSS refresh behind admin/secret checks suitable for Vercel cron.
- [x] Normalize article cards with source, URL, image, excerpt, published date, and tags.
- [x] Add rate limits and fetch timeouts around external ingestion.
- [x] Finalize R2 storage for post/course media.
- [x] Add image optimization strategy that removes current `<img>` lint warnings.

## Gate 5: Ranking, Discovery, And Healthy Retention Engine

**Files:**

- Create: `src/lib/ranking.ts`
- Modify: `src/lib/domain.ts`
- Modify: `src/server/repositories/feed.ts`
- Modify: `src/server/repositories/courses.ts`
- Modify: `src/components/feed.tsx`
- Modify: `src/components/courses.tsx`
- Test: `src/lib/ranking.test.ts`

- [x] Add transparent ranking modes: For You, Latest, Following, and Top.
- [x] Score posts, RSS items, and course releases with affinity, freshness, quality engagement, follows, and content type signals.
- [x] Add diversity controls so one author, source, category, or content type cannot dominate the first screen.
- [x] Add exploration mixing for cold start and filter-bubble resistance.
- [x] Add course discovery ranking by viewer interests, freshness, difficulty fit, completion quality, Thanks, and notebook/exercise richness.
- [x] Keep anti-dark-pattern guardrails explicit: no negative public counters, no streak anxiety, no autoplay pressure, no hidden punishment for not engaging.
- [x] Add deterministic tests for ranking, diversity, freshness decay, following mode, top mode, and course ordering.

## Gate 6: Production Hardening

**Files:**

- Modify: `README.md`
- Modify: `docs/deployment-config.md`
- Modify: env, auth, storage, analytics, and security docs
- Add CI/CD workflow after repo remote is finalized

- [x] Enforce production env validation: no default secrets, real app URL, real provider credentials.
- [x] Add Sentry and PostHog wiring with privacy-safe defaults.
- [x] Add CSP/security headers where compatible with Next/Auth/RSS/media.
- [x] Add rate limiting for write actions and uploads.
- [x] Add accessibility and mobile E2E coverage for primary surfaces.
- [x] Add performance budget checks for landing, app, Binnacle, courses, and Course Studio.
- [ ] Deploy to Vercel with Neon and storage environment variables.
- [ ] Run final release checklist: migrate, seed smoke, lint, typecheck, tests, build, E2E, screenshots, auth smoke, RSS refresh, course completion, media upload, deploy logs.
