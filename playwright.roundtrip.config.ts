import { defineConfig, devices } from "@playwright/test";

const deployed = process.env.SHOP_DEPLOYED_URL;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /roundtrip\.spec\.ts/,
  fullyParallel: false,
  retries: deployed ? 2 : 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: deployed ?? "http://localhost:4100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(deployed
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:4100",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
