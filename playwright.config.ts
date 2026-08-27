import { defineConfig, devices } from "@playwright/test";

/**
 * Local development runs. The SDK is exercised for real: the browser sends
 * batches through this app's `/ingest` proxy to whatever `.reopt-local.json`
 * points at. Nothing is stubbed — the specs read what the SDK actually built
 * from `window.__reoptDevtools`, which is fed by `ReoptClientConfig.fetch`.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: /roundtrip\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.SHOP_BASE_URL ?? "http://localhost:4100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:4100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
