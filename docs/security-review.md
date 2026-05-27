# RubberDuck Security Review Matrix

This document is the local pre-launch security matrix. It does not replace a production penetration test, but it keeps the core trust boundaries explicit and auditable.

## Trust Boundaries

| Boundary           | Entry Points                                        | Current Controls                                                                           | Launch Notes                                                                             |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Authentication     | Auth.js route, OAuth callbacks, local dev identity  | Provider allowlist, guarded local dev flow, required session for mutations                 | Run real OAuth smoke on Vercel after final callbacks exist.                              |
| Server actions     | `src/app/actions.ts`                                | Session requirement, admin requirement where needed, Zod validation, rate limits           | Keep this file as the source-of-truth mutation gateway.                                  |
| Posts/comments     | Binnacle composer, comments, updates                | Zod validation, sanitized Markdown, media allowlist, antiabuse heuristics, private reports | Add production link scanning if public abuse volume appears.                             |
| Project Signals    | GitHub URL preview, response actions                | GitHub URL parser, structured metadata, idempotent responses, private responder roster     | GitHub enrichment is non-destructive and should never overwrite author edits.            |
| Courses            | Course Studio, sections, exercises, notebook import | Zod schema, revision snapshots, Pyodide client sandbox, notebook preview/mapping           | Heavy runtime must use managed isolated execution, not user-controlled Colab automation. |
| Uploads            | Profile, post media, course media                   | MIME allowlists, size limits, owner-scoped storage keys, local/R2 adapter boundary         | Add AV scanning before unrestricted public launch if uploads are open to all.            |
| RSS/remote content | RSS refresh, remote images, OG data                 | Source allowlist from seed/config, stored normalized items, admin source health            | Watch SSRF risk if source management becomes user-editable.                              |
| Moderation/admin   | Reports, account enforcement, audit trail           | Admin-only routes, action validation, audit events, private reports                        | Provider-side access control still depends on final production auth and admin emails.    |

## Server Action Authorization Matrix

| Action                                                               | Auth     | Role          | Validation                                         | Abuse Controls                        |
| -------------------------------------------------------------------- | -------- | ------------- | -------------------------------------------------- | ------------------------------------- |
| `submitOnboarding`                                                   | Required | User          | `onboardingSchema`                                 | Rate limit                            |
| `updateProfile`, `uploadProfileMedia`                                | Required | Owner         | `profileUpdateSchema`, media validation            | Rate limit, MIME/size allowlist       |
| `createPost`, `updatePost`, `uploadPostMedia`                        | Required | User / author | `postSchema`, `postUpdateSchema`, media validation | Rate limit, antiabuse heuristics      |
| `createComment`, `updateComment`                                     | Required | User / author | `commentSchema`, `commentUpdateSchema`             | Rate limit, antiabuse heuristics      |
| `deletePost`, `deleteComment`                                        | Required | Author        | entity schemas                                     | Ownership check                       |
| `reportEntity`                                                       | Required | User          | `reportSchema`                                     | Rate limit, idempotent private report |
| `resolveReport`, `moderateEntity`, `moderateAccount`                 | Required | Admin         | moderation schemas                                 | Audit event                           |
| `toggleInterest`, `savePost`, `followProfile`                        | Required | User          | entity schemas                                     | Rate limit, idempotency               |
| `saveCourseDraft`, `uploadCourseMedia`, `updateCourseMediaMetadata`  | Required | Creator/owner | course/media schemas                               | Rate limit, owner checks              |
| `persistExerciseResult`, `markCourseSectionViewed`, `completeCourse` | Required | Learner       | progress schemas                                   | Completion gate                       |
| `thankCourse`, `saveCourse`                                          | Required | User          | course entity schema                               | Rate limit, idempotency               |
| `exportMyAccountData`, `deleteMyAccount`                             | Required | Self          | confirmation schema                                | Rate limit, cascade/export boundary   |

## Pre-Launch Manual Review

- XSS: Markdown, spoilers, embeds, RSS summaries, profile links, course body.
- SSRF: RSS sources, remote image URLs, GitHub preview, OG extraction if expanded.
- IDOR: profile editing, draft saving, course media metadata, moderation actions, saves, progress.
- Uploads: MIME spoofing, oversized files, executable content, public URL access, orphan cleanup.
- Auth/session: provider callback URLs, account linking, logout, banned/suspended accounts, admin email allowlist.
- Privacy: profile visibility, completed courses visibility, saved items owner-only, private drafts.
- Abuse: burst posts/comments, repeated links, shorteners, reports, Project Signal response spam.

## Production Evidence Required

- `pnpm security:secrets` passes before every release.
- `pnpm security:audit` has no high/critical advisories or documented mitigation.
- Sentry receives at least one non-sensitive test event in preview.
- PostHog receives one page view and one interaction event in preview if analytics is enabled.
- Vercel logs show no server action crashes through auth, onboarding, post, course, and admin smoke.
