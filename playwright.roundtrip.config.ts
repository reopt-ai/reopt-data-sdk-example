import { defineConfig, devices } from "@playwright/test";

const deployed = process.env.SHOP_DEPLOYED_URL;
const baseURL =
  deployed || process.env.SHOP_BASE_URL || "http://localhost:4100";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /(^|\/)roundtrip\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: deployed ? 2 : 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(deployed
    ? {}
    : {
        webServer: {
          command: `pnpm exec next dev --hostname 127.0.0.1 --port ${new URL(baseURL).port || "4100"}`,
          url: baseURL,
          reuseExistingServer: !process.env.E2E_RUN_ID,
          timeout: 120_000,
        },
      }),
});
