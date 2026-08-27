import { defineConfig, devices } from "@playwright/test";

/**
 * The production build, served by `next start`.
 *
 * Worth its own config because two things differ from `next dev` in ways that
 * change analytics: React StrictMode does not double-invoke effects, so web
 * vitals are reported once, and the SDK's development-only zod validation is
 * gone. A spec that passes in dev and fails here is a real difference.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:4200",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start --port 4200",
    env: {
      BETTER_AUTH_SECRET: "playwright-production-secret-32-characters-minimum",
      BETTER_AUTH_URL: "http://localhost:4200",
      REOPT_DATA_EXAMPLE_DIAGNOSTICS: "true",
    },
    url: "http://localhost:4200",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
