import { defineConfig, devices } from "@playwright/test";
import { sdkMode } from "./scripts/sdk-state.mjs";
const baseURL =
  process.env.SHOP_PRODUCTION_DIAGNOSTICS_URL ?? "http://localhost:4201";
const candidate = sdkMode(process.cwd()) !== "npm";

/**
 * Production behavior with diagnostics enabled by an explicit deployment
 * decision. Regular integration specs run here because they inspect the SDK's
 * browser recorder; the separate safety config verifies the default is closed.
 */
export default defineConfig({
  testDir: "./e2e",
  // Anchored for the same reason as the default config.
  testIgnore: [
    /(^|\/)(roundtrip|deployed|production-safety|devtool-visual)\.spec\.ts$/,
    ...(candidate ? [] : [/\/candidate\//]),
  ],
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
    command: `pnpm start --hostname 127.0.0.1 --port ${new URL(baseURL).port || "4201"}`,
    env: {
      BETTER_AUTH_SECRET: "playwright-production-secret-32-characters-minimum",
      BETTER_AUTH_URL: baseURL,
      REOPT_DATA_EXAMPLE_DIAGNOSTICS: "true",
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
