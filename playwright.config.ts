import { defineConfig, devices } from "@playwright/test";
import nextEnv from "@next/env";

/**
 * Local development runs. The SDK is exercised for real: the browser sends
 * batches through this app's `/ingest` proxy to the configured reopt endpoint.
 * Nothing is stubbed — the specs read what the SDK actually built
 * from `window.__reoptDevtools`, which is fed by `ReoptClientConfig.fetch`.
 */

/**
 * A write key so the SDK turns itself on, for runs with no project behind it.
 *
 * Without one the client disables itself and every analytics spec skipped —
 * which meant the default run of a repo that exists to find SDK defects
 * exercised no SDK at all. Most of those specs never needed a project: they
 * assert on the batch the SDK *built*, read back from `window.__reoptDevtools`,
 * and a batch is built before anyone authenticates it. The few that do need a
 * real project need more than a key anyway, and say so through `hasLiveTenant`.
 *
 * Shaped like a real key (`wpk_` + lowercase alphanumerics) because the specs
 * that read it out of a cookie name match on that shape. Ingest answers 401,
 * which is the truth, and the SDK logs it once.
 */
const PLACEHOLDER_WRITE_KEY = "wpk_e2eplaceholder0000";

// Ahead of the default so a real key in `.env.local` still wins.
nextEnv.loadEnvConfig(process.cwd());
process.env.REOPT_DATA_WRITE_KEY ||= PLACEHOLDER_WRITE_KEY;
export default defineConfig({
  testDir: "./e2e",
  // Anchored. Unanchored, `roundtrip\.spec\.ts` also matched
  // `replay.roundtrip.spec.ts` — the strongest spec in the repo, excluded from
  // every default run by a substring nobody intended to write.
  testIgnore:
    /(^|\/)(roundtrip|deployed|production-safety|production-diagnostics|devtool-visual)\.spec\.ts$/,
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
