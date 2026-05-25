<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Project Rules

- Treat this directory as the RubberDuck app.
- Preserve strict TypeScript and run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before claiming completion.
- Keep all user-facing UI bilingual through `src/lib/i18n.ts`.
- Do not add dislike, downvote, or public rejection-counter behavior.
- Validate trust-boundary inputs with Zod schemas in `src/lib/validators.ts`.
- Keep profile privacy behavior aligned with `src/lib/domain.ts`.
- Do not require production OAuth/cloud credentials for local validation.
