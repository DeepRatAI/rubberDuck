import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && pnpm start",
    env: {
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: "local-e2e-secret-with-at-least-thirty-two-characters",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXTAUTH_SECRET: "local-e2e-secret-with-at-least-thirty-two-characters",
      RUBBERDUCK_E2E_MODE: "true",
      STORAGE_DRIVER: "local",
    },
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
