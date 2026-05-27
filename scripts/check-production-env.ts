import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseEnv } from "../src/lib/env";

const projectRoot = process.cwd();
const credentialsPath =
  process.env.RUBBERDUCK_CREDENTIALS_FILE ??
  path.resolve(projectRoot, "..", "credenciales.txt");

const appEnvKeys = new Set([
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
]);

function parseCredentialEnv(text: string) {
  const values: Record<string, string> = {};

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

    if (appEnvKeys.has(key) && value.length > 0) {
      values[key] = value;
    }
  }

  return values;
}

const credentialEnv = existsSync(credentialsPath)
  ? parseCredentialEnv(readFileSync(credentialsPath, "utf8"))
  : {};

const parsed = parseEnv({
  ...process.env,
  ...credentialEnv,
  NODE_ENV: "production",
  RUBBERDUCK_STRICT_ENV: "true",
});

console.log(
  [
    "Production environment OK",
    `APP_URL=${parsed.APP_URL}`,
    `STORAGE_DRIVER=${parsed.STORAGE_DRIVER}`,
    `ADMIN_EMAILS=${parsed.ADMIN_EMAILS.length}`,
    `OAuth=${parsed.GITHUB_ID && parsed.GITHUB_SECRET ? "github" : ""}${
      parsed.GITHUB_ID &&
      parsed.GITHUB_SECRET &&
      parsed.GOOGLE_CLIENT_ID &&
      parsed.GOOGLE_CLIENT_SECRET
        ? "+"
        : ""
    }${parsed.GOOGLE_CLIENT_ID && parsed.GOOGLE_CLIENT_SECRET ? "google" : ""}`,
  ].join("\n"),
);
