# RubberDuck

RubberDuck is a local-first, cloud-ready open-source developer social network for builders who think out loud, learn in public, and publish executable technical knowledge. It includes a bilingual product shell, Binnacle social feed, Identity Hub profiles, course authoring and reading, runnable Python exercises, Jupyter notebook import/export, privacy controls, RSS refresh plumbing, notification events, Drizzle/Postgres persistence, seed data, and tests.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Radix/shadcn-style source UI primitives with lucide icons
- Drizzle ORM schema for PostgreSQL
- Auth.js/NextAuth-compatible OAuth foundation with GitHub, Google, and guarded local development credentials provider
- Tiptap rich text editor for course authoring, with `.ipynb` import into editable sections, runnable checkpoints, searchable uploaded media library with type/label filters and alt text/captions/labels, validated resources, bar/line/table visuals, autosave, and restorable immutable snapshots
- Pyodide Web Worker for browser-side Python exercise execution, including auto-loading Pyodide-compatible packages from imports
- Cloud-ready provider boundaries for Neon Postgres, Cloudflare R2 media, PostHog analytics, Cloudflare Turnstile, and Vercel env management
- Privacy-safe Sentry/PostHog observability, global security headers, and distributed write/upload rate limiting through Upstash Redis REST
- Vitest and Playwright test setup

## Local Setup

```bash
pnpm install
cp .env.example .env.local
docker compose up -d db redis
pnpm dev
```

Open http://localhost:3000.

OAuth credentials are optional for local validation. When GitHub or Google credentials are absent, the app exposes a development-only credentials provider guarded by `NODE_ENV !== "production"`.

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pyodide:sync
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm test:e2e
```

`pnpm db:seed` writes deterministic demo data into Postgres with conflict-safe inserts. It covers users, profiles, follows, Binnacle posts, post interests, nested comments, courses, sections, exercises, course progress, Thanks, saves, reports, notifications, 30 curated English RSS sources, RSS items, and badges. Draft saves create immutable course revision rows at runtime. Course media uploads write metadata, alt text, captions, and labels to Postgres and local development files to `public/uploads/course-media`, which is ignored by Git. Binnacle post media uploads write local development files to `public/uploads/posts`. Course Studio filters uploaded media by filename, alt text, caption, labels, MIME type, media kind, and selected label before attaching assets to sections.

Course and Binnacle media writes go through the storage adapters documented in `docs/media-storage.md`. `STORAGE_DRIVER=local` is the implemented local-first driver and `STORAGE_DRIVER=r2` is the implemented Cloudflare R2 production driver. `s3` and `supabase` are accepted configuration values that fail fast until a concrete provider adapter is installed, preventing accidental production writes to ephemeral local disk.

Pyodide core runtime assets are vendored into `public/pyodide` by `pnpm pyodide:sync`, which also runs automatically after `pnpm install`. The course runner serves the Python/WebAssembly runtime locally for reliable startup and uses the official Pyodide package base URL only when a lesson imports heavier packages such as NumPy.

Provider setup is documented in `docs/deployment-config.md`. Manual external setup is tracked in `docs/user-action-required.md`. Legal and community policy drafts live in `docs/legal/README.md` and are also exposed as product routes.

## Routes

- `/` landing page
- `/app` logged-in home blend of Binnacle, courses, and refreshed RSS article content
- `/onboarding` first-run profile setup
- `/u/[handle]` Identity Hub profile
- `/people` searchable people directory with explainable follow recommendations
- `/settings/profile` profile, privacy settings, profile media, account export, and account deletion
- `/binnacle` feed and filters
- `/binnacle/[postId]` nested technical discussion
- `/courses` course discovery
- `/courses/new` Tiptap course editor with notebook import, local media uploads, media search/type/label filters, alt text/caption/label editing, autosave, private restore points, snapshot restore, sections, embeds, bar/line/table visuals, and runnable checkpoints
- `/courses/[slug]` documentation-style course reader with Pyodide-backed exercise
- `/api/courses/[slug]/export` course-to-Jupyter `.ipynb` download endpoint
- `/notifications` notification center
- `/api/rss/refresh` RSS refresh endpoint protected by `x-rubberduck-rss-secret` (`x-devit-rss-secret` remains accepted for local backwards compatibility)
- `/api/health` health check
- `/legal/terms` Terms of Service draft
- `/legal/privacy` Privacy Policy draft
- `/legal/code-of-conduct` Code of Conduct
- `/legal/moderation` Moderation Policy

## Security and Product Assumptions

- No dislikes, downvotes, or public rejection counters are modeled or rendered.
- Reports are private and silent.
- Trust-boundary inputs are represented with Zod validators in `src/lib/validators.ts`.
- Markdown rendering uses `rehype-sanitize`.
- Production env checks reject default secrets, localhost app URLs, missing auth providers, local media storage, missing distributed rate limiting, missing observability, and missing moderation admin emails when strict mode is enabled.
- `RUBBERDUCK_E2E_MODE=true` is accepted only for localhost `next start` Playwright runs. It keeps production-like rendering testable locally without creating a public-production auth bypass.
- Write actions and uploads are rate-limited with Upstash Redis REST in production and a deterministic in-memory limiter in local/test mode.
- Global security headers and a CSP are configured in `next.config.ts`.
- Sentry and PostHog initialize only when their environment variables are present; defaults avoid PII, session replay, and broad autocapture.
- Pyodide runs in a browser Worker with a UI timeout. It is suitable for lightweight Python exercises, not untrusted high-risk workloads. A containerized server runner should be added before supporting arbitrary heavyweight execution.
- The browser runtime is real Python/WebAssembly execution and is covered by an E2E NumPy pipeline check. It is CPU-only; GPU workloads should use the documented Colab handoff path or a future managed GPU execution backend.
- Notebook export emits portable Jupyter JSON with RubberDuck-compatible exercise metadata. It does not execute exported notebooks server-side.
- Course media uploads only accept raster images and common browser-playable video MIME types. Binnacle post media accepts common image/video MIME types and stores immutable object paths locally or in R2. SVG and executable/script-like files are rejected. Local course media assets support editable alt text, captions, labels, search, and image/video/label filters; readers render image assets with real `alt` attributes.
- Profile visibility is resolved through explicit `public`, `followers`, and `private` rules.
- Account export intentionally excludes provider/session tokens. Account deletion cascades user-owned product data and preserves detached audit references where the schema uses `onDelete: set null`.
- The Drizzle schema is cloud-ready for Neon/Supabase/RDS-style Postgres, but no production resource is modified by this project unless migrations are run with a production `DATABASE_URL`.

## Architecture Notes

- `src/lib/domain.ts` contains pure business logic and is covered by unit tests.
- `src/db/seed.ts` writes deterministic product data into Postgres for local development and E2E tests.
- `src/server/repositories/*` owns Postgres-backed reads and mutations for primary product surfaces.
- `/api/rss/refresh` bootstraps the curated RSS source catalog, authenticates both Vercel Cron and manual operator refreshes, rejects non-article/root feed links, blocks private-network OpenGraph fetch targets, and stores real article URLs plus inherited cover images when available.
- `src/server/course-media-storage-adapter.ts` and `src/server/post-media-storage-adapter.ts` own course and Binnacle media storage boundaries for local filesystem and R2-compatible object storage.
- `src/db/schema.ts` defines the PostgreSQL contract and indexes.
- `src/components/*` owns the product surfaces and UI composition.
- `src/app/actions.ts` exposes server action boundaries with validation.
- `public/pyodide-worker.js` isolates Python execution from the main UI thread.
- `public/pyodide/*` contains generated Pyodide runtime assets copied from the installed `pyodide` package.

## Contributor and Operations Docs

- `CONTRIBUTING.md` for local setup and PR expectations.
- `SECURITY.md` for vulnerability reporting and security boundaries.
- `docs/self-hosting.md` for self-hosted deployment assumptions.
- `docs/data-retention.md` for account export/delete behavior.
- `docs/production-readiness.md` for the current production gates, staging checks, RSS cron hardening, and launch invariants.
- `docs/runbooks/release-and-rollback.md` for launch operations.
- `docs/runbooks/incident-response.md` for production incident handling.
- `docs/runbooks/moderation-operations.md` for report review and enforcement operations.
