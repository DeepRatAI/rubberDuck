# Contributing to RubberDuck

RubberDuck is a developer social network with real auth, profiles, Binnacle posts, Project Signals, RSS discovery, Course Studio, executable Python exercises, moderation, and privacy controls.

## Local Setup

```bash
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`.

Local development can use the guarded development identity. Production must use real OAuth or email authentication.

## Quality Gate

Run these before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For user-facing changes, also run:

```bash
pnpm test:e2e
```

## Product Rules

- No downvotes, dislikes, or public rejection counters.
- Reports are private.
- All user-facing static UI must be bilingual through `src/lib/i18n.ts` or a bilingual content module.
- Trust boundaries require Zod validation in `src/lib/validators.ts`.
- Profile privacy must stay aligned with `src/lib/domain.ts`.
- Local validation must not require production credentials.

## Pull Request Expectations

Every PR should state:

- What changed.
- How it was validated.
- Any schema, env, auth, privacy, moderation, or deployment impact.
- Screenshots for visible UI changes.

## Database Changes

Use Drizzle migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Keep production migrations small, deterministic, and paired with a rollback or restore plan.

## Security and Abuse

Never commit secrets, tokens, real `.env.local`, exported user data, or provider credentials.

If your change touches auth, uploads, external URLs, RSS, embeds, markdown, executable code, server actions, or moderation, include tests or a manual validation note for the abuse path.
