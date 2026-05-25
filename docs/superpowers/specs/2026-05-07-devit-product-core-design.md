# devit Product Core Design

## Objective

Convert the current MVP into the first real product foundation for **devit**. The immediate goal is not a full visual redesign; it is to make the core product stateful, persistent, authenticated, testable, and ready for the later SOTA course studio and discovery phases.

## Decision

Phase 1 prioritizes **real product core + rename + minimal brand foundation** over a strong identity redesign. A major rebrand before persistence would polish simulated flows. The correct sequence is to rename and stabilize the domain, move primary data and mutations into Postgres, and then build the final devit visual identity on top of real flows.

## Scope

Phase 1 includes:

- Rename product-facing and internal metadata to devit where it affects the app, docs, package, env defaults, service naming, tests, and copy.
- Preserve product concepts: Binnacle, Identity Hub, Thanks, CoWork, Meta.
- Replace fixture-only product state with Drizzle/Postgres repositories for primary reads.
- Convert `pnpm db:seed` from inventory preview into idempotent database seed inserts.
- Wire primary server actions to authenticated, validated, persistent DB mutations.
- Keep local dev usable without external OAuth credentials through a guarded development identity.
- Keep the existing visual structure, but update brand name/copy to devit.
- Maintain no-dislike/no-downvote guarantees in schema, domain logic, UI, and tests.

Phase 1 does not include:

- Final devit design system refresh.
- Full production moderation console.
- Containerized notebook execution.
- Full `.ipynb` conversion pipeline.
- ML ranking or semantic recommendations.
- External storage integration.

## Architecture

- `src/lib/brand.ts` centralizes devit naming and product copy.
- `src/db/seed.ts` inserts deterministic UUID-based demo data into Postgres with conflict-safe writes.
- `src/server/repositories/*` owns typed data access for profiles, feed, courses, notifications, and mutations.
- Server-rendered pages fetch initial state from repositories. Client components receive typed props and own only UI state.
- `src/app/actions.ts` validates inputs with Zod, uses a development-safe current user helper, then writes to Postgres in transactions where multi-table behavior is required.
- Unit tests cover pure domain logic and repository mappers; E2E covers the primary routes against seeded data.

## Acceptance Criteria

- Product name is devit in app shell, landing, metadata, README, tests, seed output, health endpoint, and package metadata.
- Legacy product names return no product-code references in repository search.
- `pnpm db:seed` writes users, profiles, follows, posts, comments, courses, course sections, exercises, progress, thanks, saves, reports, notifications, RSS sources/items, and badges into Postgres.
- Main app routes render from Postgres-backed repositories rather than in-memory fixture state.
- Server actions for onboarding, profile update, post/comment/report, course draft, exercise result, and completion persist or produce DB-backed side effects.
- The UI still passes desktop/mobile E2E tests.
- Validation passes: `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm test:e2e`.

## Follow-Up Phases

- Phase 2: Course Studio SOTA with persistent block editor, autosave, `.ipynb` import, exercise telemetry, export, and visualizations.
- Phase 3: Social graph, search, RSS jobs, and discovery ranking.
- Phase 4: Identity Hub customization, privacy completeness, badges, and governance/moderation operations.
- Phase 5: Production hardening, observability, storage, rate limits, CI/CD, and deployment.
