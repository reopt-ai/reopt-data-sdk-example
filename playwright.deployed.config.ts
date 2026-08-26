import { defineConfig, devices } from "@playwright/test";

/**
 * A deployed instance. No `webServer`: the target is already running, and the
 * point is to check that the deployed proxy really rewrites `/ingest/*` and
 * really seeds the device cookie — the two things that only break in
 * production, behind a CDN.
 */
const baseURL = process.env.SHOP_DEPLOYED_URL;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /deployed\.spec\.ts/,
  fullyParallel: true,
  retries: 2,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: baseURL ?? "http://localhost:4100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
