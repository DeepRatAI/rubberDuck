# Data Retention and Account Deletion

RubberDuck now exposes account export and deletion controls in `/settings/profile`.

## Export

Account export returns a JSON archive containing:

- account identity
- profile
- OAuth provider identifiers without provider tokens
- follows and interest records
- posts, comments, Project Signal responses
- created courses, sections, exercises, revisions, and media asset metadata
- course progress
- Thanks and saves
- reports submitted by the user
- notifications involving the user
- audit events where the user was the actor

Intentionally excluded:

- OAuth access tokens
- refresh tokens
- ID tokens
- session tokens
- verification tokens

## Deletion

The user-facing deletion flow requires typing `DELETE`.

Deleting the user row cascades:

- auth accounts and sessions
- profile
- follows
- authored posts and dependent comments/interests/project responses
- authored comments
- created courses and dependent sections/exercises/progress/thanks
- course media owned by the user
- saves
- submitted reports
- notifications received by the user
- badges

Audit and notification actor references configured with `onDelete: set null` are retained without the deleted user identity.

## Production Follow-Ups

Before public launch, confirm:

- final legal retention periods
- backup retention and deletion semantics in Neon
- object storage lifecycle cleanup for orphaned files
- appeal/security exception process
- whether account deletion should create a delayed grace period instead of immediate deletion
