import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

describe("environment configuration", () => {
  it("accepts NextAuth aliases while exposing the canonical app env contract", () => {
    const parsed = parseEnv({
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "nextauth-secret-with-enough-length",
    });

    expect(parsed.APP_URL).toBe("http://localhost:3000");
    expect(parsed.AUTH_SECRET).toBe("nextauth-secret-with-enough-length");
  });

  it("derives the app URL from Vercel preview deployments when no canonical URL is set", () => {
    const parsed = parseEnv({
      VERCEL_URL: "rubberduck-random-preview.vercel.app",
      NEXTAUTH_SECRET: "nextauth-secret-with-enough-length",
    });

    expect(parsed.APP_URL).toBe("https://rubberduck-random-preview.vercel.app");
  });

  it("keeps optional production integrations typed and off by default", () => {
    const parsed = parseEnv({
      NEXT_PUBLIC_POSTHOG_TOKEN: "phc_public_token",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4-public-site-key",
      TURNSTILE_SECRET_KEY: "0x4-private-secret-key",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      ADMIN_EMAILS: "admin@example.dev, ops@example.dev",
      STORAGE_DRIVER: "r2",
      R2_ACCOUNT_ID: "account-id",
      R2_BUCKET: "dev4all",
      R2_ACCESS_KEY_ID: "r2-access-key",
      R2_SECRET_ACCESS_KEY: "r2-secret-key",
      R2_PUBLIC_BASE_URL: "https://media.example.dev",
    });

    expect(parsed.NEXT_PUBLIC_POSTHOG_HOST).toBe("https://us.i.posthog.com");
    expect(parsed.ADMIN_EMAILS).toEqual([
      "admin@example.dev",
      "ops@example.dev",
    ]);
    expect(parsed.STORAGE_DRIVER).toBe("r2");
    expect(parsed.R2_BUCKET).toBe("dev4all");
  });

  it("rejects production mode without real auth and public app configuration", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        RUBBERDUCK_STRICT_ENV: "true",
        NEXTAUTH_URL: "http://localhost:3000",
        NEXTAUTH_SECRET: "dev-only-auth-secret-change-before-production",
      }),
    ).toThrow();
  });

  it("allows local production builds to compile with local defaults", () => {
    const parsed = parseEnv({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "local-build-secret-with-enough-length",
    });

    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.NEXT_PHASE).toBe("phase-production-build");
  });

  it("allows local production E2E runtime with explicit local-only mode", () => {
    const parsed = parseEnv({
      NODE_ENV: "production",
      RUBBERDUCK_E2E_MODE: "true",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "local-e2e-secret-with-at-least-thirty-two-characters",
      STORAGE_DRIVER: "local",
    });

    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.RUBBERDUCK_E2E_MODE).toBe("true");
    expect(parsed.APP_URL).toBe("http://localhost:3000");
    expect(parsed.STORAGE_DRIVER).toBe("local");
  });

  it("rejects production E2E mode outside localhost", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        RUBBERDUCK_E2E_MODE: "true",
        NEXTAUTH_URL: "https://rubberduck.net",
        NEXTAUTH_SECRET: "local-e2e-secret-with-at-least-thirty-two-characters",
      }),
    ).toThrow(/RUBBERDUCK_E2E_MODE is only allowed for localhost/i);
  });

  it("accepts production mode with a public URL, strong secret, and provider", () => {
    const parsed = parseEnv({
      NODE_ENV: "production",
      RUBBERDUCK_STRICT_ENV: "true",
      NEXTAUTH_URL: "https://rubberduck.net",
      NEXTAUTH_SECRET: "production-secret-with-at-least-thirty-two-characters",
      GITHUB_ID: "github-client-id",
      GITHUB_SECRET: "github-client-secret",
      STORAGE_DRIVER: "r2",
      R2_ACCOUNT_ID: "account-id",
      R2_BUCKET: "dev4all",
      R2_ACCESS_KEY_ID: "r2-access-key",
      R2_SECRET_ACCESS_KEY: "r2-secret-key",
      R2_PUBLIC_BASE_URL: "https://media.rubberduck.net",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      NEXT_PUBLIC_POSTHOG_TOKEN: "phc_public_token",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.us.sentry.io/1",
      ADMIN_EMAILS: "admin@rubberduck.net",
    });

    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.APP_URL).toBe("https://rubberduck.net");
  });

  it("keeps the legacy strict env alias working during the rebrand", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        DEVIT_STRICT_ENV: "true",
        NEXTAUTH_URL: "http://localhost:3000",
        NEXTAUTH_SECRET: "dev-only-auth-secret-change-before-production",
      }),
    ).toThrow();
  });

  it("rejects partial Turnstile configuration even outside production strict mode", () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4-public-site-key",
      }),
    ).toThrow(/Turnstile requires both/i);
  });
});
