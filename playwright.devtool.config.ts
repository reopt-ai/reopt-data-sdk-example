import { defineConfig, devices } from "@playwright/test";

/** Local sibling-SDK visual contract; excluded from published-package suites. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /devtool-visual\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:4100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev:stack",
    url: "http://localhost:4100/lab",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
