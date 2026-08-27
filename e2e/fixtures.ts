import nextEnv from "@next/env";
import { expect, type Page } from "@playwright/test";

// Types only — erased at compile time. Reusing the devtool's own types keeps
// the specs honest: if the recorder's shape changes, these stop compiling
// instead of silently asserting on a field that no longer exists.
import type { RecordedBatch, RecordedEvent } from "@reopt-ai/data-sdk-devtool";

/**
 * Helpers shared by the specs.
 *
 * Two rules follow from how the recorder works, and both are easy to get
 * wrong:
 *
 * 1. **Navigate in the page, not with `page.goto()`.** A full document load
 *    creates a new JS context, so the recorded batches are gone with it. Only
 *    client-side navigation keeps the history.
 * 2. **`$pageleave` on unload is not observable here.** The SDK flushes it
 *    through `sendBeacon`, which does not go via `config.fetch`. A route change
 *    *within* the app emits it through the normal queue, so that is how the
 *    specs produce one.
 *
 * The specs assert on what the SDK *built*, not on what the network carried:
 * the app injects `ReoptClientConfig.fetch` from `@reopt-ai/data-sdk-devtool`,
 * which records every batch into a store the page exposes as
 * `window.__reoptDevtools`. That is the seam the SDK
 * itself documents for tests, and it beats `page.route()` interception — an
 * intercepted request never reaches ingest, so a spec that stubs the network
 * cannot tell a correct payload from one the server would reject.
 */

export type { RecordedBatch, RecordedEvent };

nextEnv.loadEnvConfig(process.cwd());

/** Whether a public project key is configured for analytics contract tests. */
export function hasTenant(): boolean {
  return Boolean(process.env.REOPT_DATA_WRITE_KEY);
}

export interface RoundtripTenant {
  baseUrl: string;
  projectId: string;
  clientId: string;
  clientSecret: string;
}

/** Server-only test credentials. Never evaluate this inside the browser page. */
export function roundtripTenant(): RoundtripTenant | null {
  if (
    process.env.REOPT_DATA_WRITE_KEY &&
    process.env.REOPT_DATA_PROJECT_ID &&
    process.env.REOPT_DATA_CLIENT_ID &&
    process.env.REOPT_DATA_CLIENT_SECRET
  ) {
    return {
      baseUrl: process.env.REOPT_DATA_BASE_URL ?? "https://data.reopt.ai",
      projectId: process.env.REOPT_DATA_PROJECT_ID,
      clientId: process.env.REOPT_DATA_CLIENT_ID,
      clientSecret: process.env.REOPT_DATA_CLIENT_SECRET,
    };
  }
  return null;
}

export const NO_TENANT_REASON =
  "No reopt project is configured. Set REOPT_DATA_WRITE_KEY to run analytics contract tests.";

/** Sets the SDK option cookie before the first load, so the client is created with it. */
export async function setFlags(page: Page, flags: string): Promise<void> {
  await page.context().addCookies([
    {
      name: "shop_sdk_flags",
      value: flags,
      url: page.url().startsWith("http")
        ? new URL(page.url()).origin
        : "http://localhost:4100",
    },
  ]);
}

export async function batches(page: Page): Promise<RecordedBatch[]> {
  return page.evaluate(() => window.__reoptDevtools?.state().batches ?? []);
}

export async function events(page: Page): Promise<RecordedEvent[]> {
  return (await batches(page)).flatMap((batch) => batch.events);
}

/** Waits for an event with `name` to have been sent, and returns it. */
export async function waitForEvent(
  page: Page,
  name: string,
  timeout = 15_000,
): Promise<RecordedEvent> {
  await expect
    .poll(
      async () =>
        (await events(page)).some((event) => event.payload?.name === name),
      {
        timeout,
        message: `${name} was not delivered`,
      },
    )
    .toBe(true);

  const match = (await events(page)).find(
    (event) => event.payload?.name === name,
  );
  if (!match) throw new Error(`unreachable: ${name}`);
  return match;
}

/**
 * Waits until the page has hydrated.
 *
 * `window.__reoptDevtools` is installed from an effect, so its presence proves
 * React is running. Needed before clicking anything backed by a server action:
 * a form with an `action` function does nothing on click until hydration, and
 * the click is simply swallowed — which reads as "the order never happened".
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__reoptDevtools !== undefined);
}

/**
 * Adds a product to the cart and waits for the header badge to agree.
 *
 * The click starts a transition; navigating before it settles lands on an
 * empty cart and the checkout redirects away — a flake that looks like an
 * analytics failure but is a race in the spec.
 */
export async function addToCart(page: Page): Promise<void> {
  const badge = page.getByTestId("cart-link");
  const before = Number((await badge.textContent())?.replace(/\D/g, "") ?? "0");
  await page.getByTestId("add-to-cart").click();
  await expect(badge).toHaveText(new RegExp(String(before + 1)));
}

/** Client-side navigation, which keeps the recorded batches alive. */
export async function navigate(
  page: Page,
  linkName: string | RegExp,
): Promise<void> {
  await page.getByRole("link", { name: linkName }).first().click();
  await page.waitForLoadState("networkidle");
}

export async function deviceCookie(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  return (
    cookies.find(
      (cookie) =>
        cookie.name.startsWith("reopt_") && cookie.name.endsWith("_device"),
    )?.value ?? null
  );
}
