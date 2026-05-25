# Media Storage

RubberDuck course and Binnacle media are intentionally local-first while keeping a provider boundary for production object storage.

## Current Drivers

`STORAGE_DRIVER=local` writes uploaded course media to:

```text
public/uploads/course-media/<ownerId>/<assetId>.<extension>
```

and uploaded Binnacle post media to:

```text
public/uploads/posts/<ownerId>/<assetId>.<extension>
```

`STORAGE_DRIVER=r2` writes uploaded course and Binnacle media to Cloudflare R2 through its S3-compatible API and stores or returns the configured public URL.

The database stores the public URL in `course_media_assets.url`, plus editorial metadata such as alt text, captions, and labels.
Binnacle post media is stored in the post JSON payload after the upload action returns its public URL.

## Adapter Boundary

Course upload flow calls `createCourseMediaStorageAdapter(env.STORAGE_DRIVER)` before metadata is persisted. Binnacle upload flow calls `createPostMediaStorageAdapter(env.STORAGE_DRIVER)` before the post is saved. A storage adapter must return:

- `driver`: storage driver id.
- `publicUrl`: URL stored on the media asset and used by course embeds.
- `storageKey`: provider-specific object key or local filesystem key.
- `rollback`: cleanup function called if database persistence fails after the bytes were written.

Course media keeps the file/object write and database insert in a compensating transaction shape: write bytes first, insert metadata second, roll back the object if metadata persistence fails. Binnacle media upload is a two-step browser flow, so production deployments should use object lifecycle cleanup for abandoned post uploads.

## Cloud Drivers

`r2` is implemented. `s3` and `supabase` are accepted configuration values but intentionally fail fast until concrete provider adapters are implemented. This prevents a production deployment from silently writing files to local ephemeral storage.

R2 requires:

- `STORAGE_DRIVER=r2`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`

The public base URL should be a Cloudflare R2 Public Development URL during early testing or a custom media domain in production.

Provider implementation checklist:

- Keep the public URL compatible with course embed and Binnacle post validation or extend validation deliberately.
- Preserve the same rollback contract.
- Use least-privilege credentials scoped to the media bucket.
- Enforce content type and size validation before upload.
- Prefer immutable object keys based on `ownerId` and `assetId`.
- Add lifecycle/retention policy for orphaned draft and abandoned post media.
- Add integration tests against the selected provider or a compatible local emulator.
