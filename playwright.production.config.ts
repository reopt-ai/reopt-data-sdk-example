import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.SHOP_PRODUCTION_URL ?? "http://localhost:4200";

/**
 * The secure production default. This suite deliberately does not opt in to
 * diagnostics and proves that every diagnostic surface remains unreachable.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /production-safety\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start --hostname 127.0.0.1 --port ${new URL(baseURL).port || "4200"}`,
    env: {
      BETTER_AUTH_SECRET: "playwright-production-secret-32-characters-minimum",
      BETTER_AUTH_URL: baseURL,
      REOPT_DATA_EXAMPLE_DIAGNOSTICS: "false",
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
