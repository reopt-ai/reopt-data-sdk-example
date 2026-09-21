import { defineConfig, devices } from "@playwright/test";

/**
 * A deployed instance. No `webServer`: the target is already running, and the
 * point is to check that the deployed proxy really rewrites `/ingest/*` and
 * really seeds the device cookie — the two things that only break in
 * production, behind a CDN.
 */
// No fallback. A config whose whole subject is "the deployed instance" must
// not quietly retarget localhost when the URL is missing: the run goes green
// and reports that a deployment it never contacted rewrites /ingest correctly.
const baseURL = process.env.SHOP_DEPLOYED_URL;
if (!baseURL)
  throw new Error(
    "SHOP_DEPLOYED_URL is unset. This suite checks a deployed instance; there is nothing to check without one.",
  );

export default defineConfig({
  testDir: "./e2e",
  testMatch: /deployed\.spec\.ts/,
  fullyParallel: true,
  retries: 2,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
