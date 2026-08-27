import { defineConfig, devices } from "@playwright/test";

/**
 * Production behavior with diagnostics enabled by an explicit deployment
 * decision. Regular integration specs run here because they inspect the SDK's
 * browser recorder; the separate safety config verifies the default is closed.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: /(roundtrip|deployed|production-safety)\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:4201",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start --port 4201",
    env: {
      BETTER_AUTH_SECRET: "playwright-production-secret-32-characters-minimum",
      BETTER_AUTH_URL: "http://localhost:4201",
      REOPT_DATA_EXAMPLE_DIAGNOSTICS: "true",
    },
    url: "http://localhost:4201",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
