import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const projectFile = JSON.parse(
  readFileSync(path.join(projectRoot, ".vercel", "project.json"), "utf8"),
);
const credentialsPath =
  process.env.RUBBERDUCK_CREDENTIALS_FILE ??
  path.resolve(projectRoot, "..", "credenciales.txt");
const rawCredentials = readFileSync(credentialsPath, "utf8");

const appEnvKeys = [
  "APP_URL",
  "NEXTAUTH_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "GITHUB_ID",
  "GITHUB_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "EMAIL_SERVER",
  "EMAIL_FROM",
  "CRON_SECRET",
  "RSS_REFRESH_SECRET",
  "STORAGE_DRIVER",
  "NEXT_PUBLIC_DEFAULT_LOCALE",
  "ADMIN_EMAILS",
  "NEXT_PUBLIC_POSTHOG_TOKEN",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_AUTH_TOKEN",
  "R2_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL",
  "BLOB_READ_WRITE_TOKEN",
];

const requiredForProductionLikeRuntime = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "CRON_SECRET",
  "RSS_REFRESH_SECRET",
  "ADMIN_EMAILS",
  "STORAGE_DRIVER",
  "R2_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_POSTHOG_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
];

function parseLooseCredentials(text) {
  const values = new Map();

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)$/);

    if (!match) {
      continue;
    }

    const key = match[1];
    const value = match[2]
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();

    if (appEnvKeys.includes(key) && value.length > 0) {
      values.set(key, value);
    }
  }

  return values;
}

function extractVercelToken(text) {
  const explicit = text.match(/^\s*VERCEL_TOKEN\s*[=:]\s*(.+)$/m)?.[1];
  if (explicit) {
    return explicit.trim().replace(/^["']|["']$/g, "");
  }

  const candidates = [...new Set(text.match(/[A-Za-z0-9_-]{20,}/g) ?? [])];
  return candidates.find(
    (token) => !/^gh[pousr]_/.test(token) && !/^github_pat_/.test(token),
  );
}

function envTypeForKey(key) {
  if (
    key.startsWith("NEXT_PUBLIC_") ||
    [
      "APP_URL",
      "NEXTAUTH_URL",
      "STORAGE_DRIVER",
      "R2_BUCKET",
      "R2_PUBLIC_BASE_URL",
    ].includes(key)
  ) {
    return "plain";
  }

  return "encrypted";
}

const vercelToken = extractVercelToken(rawCredentials);
if (!vercelToken) {
  console.error("Missing Vercel token in credentials file.");
  process.exit(1);
}

const envValues = parseLooseCredentials(rawCredentials);
const hasGitHubOAuth =
  envValues.has("GITHUB_ID") && envValues.has("GITHUB_SECRET");
const hasGoogleOAuth =
  envValues.has("GOOGLE_CLIENT_ID") && envValues.has("GOOGLE_CLIENT_SECRET");
const hasEmail = envValues.has("EMAIL_SERVER") && envValues.has("EMAIL_FROM");
const missing = requiredForProductionLikeRuntime.filter(
  (key) => !envValues.has(key),
);

if (!hasGitHubOAuth && !hasGoogleOAuth && !hasEmail) {
  missing.push(
    "GITHUB_ID/GITHUB_SECRET or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET or EMAIL_SERVER/EMAIL_FROM",
  );
}

if (missing.length > 0) {
  console.error("Missing required production-like Vercel env keys:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error(
    `Add them as KEY=value lines to ${credentialsPath} and rerun pnpm vercel:env:sync.`,
  );
  process.exit(1);
}

const payload = [...envValues.entries()].map(([key, value]) => ({
  key,
  value,
  type: envTypeForKey(key),
  target: ["production", "preview", "development"],
  comment: "Synced by RubberDuck local release tooling.",
}));

const response = await fetch(
  `https://api.vercel.com/v10/projects/${projectFile.projectId}/env?teamId=${projectFile.orgId}&upsert=true`,
  {
    method: "POST",
    headers: {
      authorization: `Bearer ${vercelToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  },
);

const body = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error(
    `Vercel env sync failed with HTTP ${response.status}: ${
      body.error?.message ?? "unknown error"
    }`,
  );
  process.exit(1);
}

const envListResponse = await fetch(
  `https://api.vercel.com/v10/projects/${projectFile.projectId}/env?teamId=${projectFile.orgId}`,
  {
    headers: {
      authorization: `Bearer ${vercelToken}`,
    },
  },
);
const envListBody = await envListResponse.json().catch(() => ({}));
const syncedKeys = new Set((envListBody.envs ?? []).map((env) => env.key));
const unsynced = [...envValues.keys()].filter((key) => !syncedKeys.has(key));

if (unsynced.length > 0) {
  console.error("Vercel env sync did not persist these keys:");
  for (const key of unsynced) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log(
  `Synced ${payload.length} Vercel env keys for ${projectFile.projectName}. Values were not printed.`,
);
