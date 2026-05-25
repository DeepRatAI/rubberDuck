import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PHASE: optionalString,
    RUBBERDUCK_STRICT_ENV: z.enum(["true", "false"]).default("false"),
    DEVIT_STRICT_ENV: z.enum(["true", "false"]).default("false"),
    RUBBERDUCK_E2E_MODE: z.enum(["true", "false"]).default("false"),
    APP_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgres://devit:devit@localhost:5432/devit"),
    AUTH_SECRET: z
      .string()
      .min(16)
      .default("dev-only-auth-secret-change-before-production"),
    GITHUB_ID: z.string().optional(),
    GITHUB_SECRET: z.string().optional(),
    GITHUB_TOKEN: optionalString,
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    EMAIL_SERVER: optionalString,
    EMAIL_FROM: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.email().optional(),
    ),
    CRON_SECRET: optionalString,
    RSS_REFRESH_SECRET: z.string().min(8).default("local-rss-refresh-secret"),
    STORAGE_DRIVER: z.enum(["local", "s3", "r2", "supabase"]).default("local"),
    NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["en", "es"]).default("en"),
    NEXT_PUBLIC_POSTHOG_TOKEN: optionalString,
    NEXT_PUBLIC_POSTHOG_HOST: optionalUrl.default("https://us.i.posthog.com"),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
    TURNSTILE_SECRET_KEY: optionalString,
    UPSTASH_REDIS_REST_URL: optionalUrl,
    UPSTASH_REDIS_REST_TOKEN: optionalString,
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
    SENTRY_DSN: optionalUrl,
    SENTRY_ORG: optionalString,
    SENTRY_PROJECT: optionalString,
    SENTRY_AUTH_TOKEN: optionalString,
    ADMIN_EMAILS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    BLOB_READ_WRITE_TOKEN: optionalString,
    R2_ACCOUNT_ID: optionalString,
    R2_BUCKET: optionalString,
    R2_ACCESS_KEY_ID: optionalString,
    R2_SECRET_ACCESS_KEY: optionalString,
    R2_PUBLIC_BASE_URL: optionalUrl,
  })
  .superRefine((value, context) => {
    const isProductionBuild = value.NEXT_PHASE === "phase-production-build";
    const isLocalAppUrl =
      value.APP_URL.includes("localhost") ||
      value.APP_URL.includes("127.0.0.1");
    const isLocalProductionE2eRuntime =
      value.NODE_ENV === "production" &&
      value.RUBBERDUCK_E2E_MODE === "true" &&
      isLocalAppUrl;
    const strictProductionCheck =
      value.RUBBERDUCK_STRICT_ENV === "true" ||
      value.DEVIT_STRICT_ENV === "true" ||
      !isProductionBuild;

    if (
      value.NODE_ENV !== "production" ||
      !strictProductionCheck ||
      isLocalProductionE2eRuntime
    ) {
      if (
        Boolean(value.NEXT_PUBLIC_TURNSTILE_SITE_KEY) !==
        Boolean(value.TURNSTILE_SECRET_KEY)
      ) {
        context.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
          message:
            "Turnstile requires both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY when enabled.",
        });
      }

      if (
        value.STORAGE_DRIVER === "r2" &&
        (!value.R2_BUCKET ||
          !value.R2_PUBLIC_BASE_URL ||
          !value.R2_ACCOUNT_ID ||
          !value.R2_ACCESS_KEY_ID ||
          !value.R2_SECRET_ACCESS_KEY)
      ) {
        context.addIssue({
          code: "custom",
          path: ["R2_BUCKET"],
          message:
            "STORAGE_DRIVER=r2 requires R2_BUCKET, R2_PUBLIC_BASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
        });
      }

      return;
    }

    if (
      value.AUTH_SECRET === "dev-only-auth-secret-change-before-production" ||
      value.AUTH_SECRET.length < 32
    ) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message:
          "Production requires an explicit AUTH_SECRET of at least 32 characters.",
      });
    }

    if (isLocalAppUrl || value.RUBBERDUCK_E2E_MODE === "true") {
      context.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message:
          "Production APP_URL must be the public deployment URL. RUBBERDUCK_E2E_MODE is only allowed for localhost test runs.",
      });
    }

    const hasOAuth =
      Boolean(value.GITHUB_ID && value.GITHUB_SECRET) ||
      Boolean(value.GOOGLE_CLIENT_ID && value.GOOGLE_CLIENT_SECRET);
    const hasEmail = Boolean(value.EMAIL_SERVER && value.EMAIL_FROM);

    if (!hasOAuth && !hasEmail) {
      context.addIssue({
        code: "custom",
        path: ["GITHUB_ID"],
        message:
          "Production requires at least one OAuth provider or email provider.",
      });
    }

    if (value.STORAGE_DRIVER === "local") {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_DRIVER"],
        message:
          "Production requires object storage. Use STORAGE_DRIVER=r2 with configured R2 credentials.",
      });
    }

    if (
      value.STORAGE_DRIVER === "r2" &&
      (!value.R2_BUCKET ||
        !value.R2_PUBLIC_BASE_URL ||
        !value.R2_ACCOUNT_ID ||
        !value.R2_ACCESS_KEY_ID ||
        !value.R2_SECRET_ACCESS_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["R2_BUCKET"],
        message:
          "STORAGE_DRIVER=r2 requires R2_BUCKET, R2_PUBLIC_BASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
      });
    }

    if (!value.UPSTASH_REDIS_REST_URL || !value.UPSTASH_REDIS_REST_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["UPSTASH_REDIS_REST_URL"],
        message:
          "Production requires Upstash Redis REST credentials for distributed rate limiting.",
      });
    }

    if (!value.NEXT_PUBLIC_POSTHOG_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_POSTHOG_TOKEN"],
        message:
          "Production requires NEXT_PUBLIC_POSTHOG_TOKEN for product analytics.",
      });
    }

    if (!value.NEXT_PUBLIC_SENTRY_DSN && !value.SENTRY_DSN) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SENTRY_DSN"],
        message:
          "Production requires Sentry DSN configuration for error monitoring.",
      });
    }

    if (
      Boolean(value.NEXT_PUBLIC_TURNSTILE_SITE_KEY) !==
      Boolean(value.TURNSTILE_SECRET_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
        message:
          "Turnstile requires both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY when enabled.",
      });
    }

    if (value.ADMIN_EMAILS.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_EMAILS"],
        message:
          "Production requires at least one ADMIN_EMAILS entry for moderation operations.",
      });
    }
  });

export function parseEnv(input: NodeJS.ProcessEnv | Record<string, unknown>) {
  return envSchema.parse({
    ...input,
    APP_URL: input.APP_URL ?? input.NEXTAUTH_URL,
    AUTH_SECRET: input.AUTH_SECRET ?? input.NEXTAUTH_SECRET,
    RSS_REFRESH_SECRET: input.RSS_REFRESH_SECRET ?? input.CRON_SECRET,
  });
}

export const env = parseEnv(process.env);
