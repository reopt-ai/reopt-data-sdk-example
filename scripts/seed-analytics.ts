#!/usr/bin/env tsx

import { chromium, type Browser, type Page } from "@playwright/test";

import {
  buildAnalyticsDemoJourneys,
  summarizeAnalyticsDemo,
  type AnalyticsDemoJourney,
} from "../lib/reopt/analytics-demo";
import { FLAGS_COOKIE } from "../lib/reopt/flags";

const PARALLEL_JOURNEYS = 4;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runId(): string {
  const value =
    argument("--run-id") ??
    `analytics-demo-${new Date()
      .toISOString()
      .replaceAll(/[-:.TZ]/g, "")
      .slice(0, 14)}`;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(value)) {
    throw new Error(
      "--run-id must use 1-80 letters, numbers, underscores, or hyphens",
    );
  }
  return value;
}

function storefrontUrl(): URL {
  const value =
    argument("--base-url") ??
    process.env.SHOP_BASE_URL ??
    "http://localhost:4100";
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("--base-url must be an HTTP(S) storefront URL");
  }
  return url;
}

function event(
  journey: AnalyticsDemoJourney,
  name: string,
): Record<string, unknown> | undefined {
  return journey.events.find((candidate) => candidate.name === name)
    ?.properties;
}

async function waitForAccepted(
  page: Page,
  name: string,
  demoRunId: string,
): Promise<void> {
  await page.waitForFunction(
    ({ eventName, runIdValue }) =>
      window.__reoptDevtools
        ?.state()
        .batches.some(
          (batch) =>
            batch.phase === "accepted" &&
            batch.events.some(
              (entry) =>
                entry.payload?.name === eventName &&
                entry.payload.properties?.demo_run_id === runIdValue,
            ),
        ) ?? false,
    { eventName: name, runIdValue: demoRunId },
    { timeout: 30_000 },
  );
}

async function replayJourney(
  browser: Browser,
  baseUrl: URL,
  demoRunId: string,
  journey: AnalyticsDemoJourney,
  index: number,
): Promise<void> {
  const context = await browser.newContext();
  try {
    await context.addCookies([
      {
        name: FLAGS_COOKIE,
        // Empty means every optional flag is disabled, including automatic
        // page views. The product page then emits one property-rich manual view.
        value: "",
        url: baseUrl.origin,
      },
    ]);

    const page = await context.newPage();
    const pageview = event(journey, "$pageview");
    const productSlug = String(pageview?.product_slug ?? "");
    const landing = new URL(`/products/${productSlug}`, baseUrl);
    landing.searchParams.set("demo_run_id", demoRunId);
    landing.searchParams.set("demo_cohort", journey.cohortId);
    for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
      const value = pageview?.[key];
      if (typeof value === "string" && value) {
        landing.searchParams.set(key, value);
      }
    }

    const referrer = pageview?.referrer;
    await page.goto(
      landing.href,
      typeof referrer === "string" && referrer ? { referer: referrer } : {},
    );
    await page.waitForFunction(
      () => window.__reoptDevtools?.state().config !== null,
    );
    const writeKeyPresent = await page.evaluate(
      () => window.__reoptDevtools?.state().config?.writeKeyPresent ?? false,
    );
    if (!writeKeyPresent) {
      throw new Error(
        "The storefront has no REOPT_DATA_WRITE_KEY; configure it before applying the seed",
      );
    }
    await waitForAccepted(page, "product.viewed", demoRunId);

    if (!event(journey, "cart.added")) return;
    const cartBadge = page.getByTestId("cart-link");
    const before = Number(
      (await cartBadge.textContent())?.replace(/\D/g, "") ?? "0",
    );
    await page.getByTestId("add-to-cart").click();
    await page.waitForFunction(
      ({ previous }) => {
        const text = document
          .querySelector('[data-testid="cart-link"]')
          ?.textContent?.replace(/\D/g, "");
        return Number(text ?? "0") > previous;
      },
      { previous: before },
    );
    await waitForAccepted(page, "cart.added", demoRunId);

    if (!event(journey, "checkout.started")) return;
    await cartBadge.click();
    await page.waitForURL(/\/cart(?:\?.*)?$/);
    await page.getByTestId("to-checkout").click();
    await page.waitForURL(/\/checkout(?:\?.*)?$/);
    await waitForAccepted(page, "checkout.started", demoRunId);

    const submission = event(journey, "checkout.submitted");
    if (!submission) return;
    if (submission.mode === "route-handler") {
      await page
        .getByLabel("Route Handler — verify an explicit device ID handoff")
        .check();
    }
    await page
      .getByTestId("email")
      .fill(`analytics-seed-${index}@example.invalid`);
    await page.getByTestId("place-order").click();
    await page.getByTestId("order-summary").waitFor({ state: "visible" });
    await waitForAccepted(page, "checkout.submitted", demoRunId);
  } finally {
    await context.close();
  }
}

async function replayInBatches(
  browser: Browser,
  baseUrl: URL,
  demoRunId: string,
  journeys: AnalyticsDemoJourney[],
): Promise<void> {
  let completed = 0;
  for (let offset = 0; offset < journeys.length; offset += PARALLEL_JOURNEYS) {
    const batch = journeys.slice(offset, offset + PARALLEL_JOURNEYS);
    await Promise.all(
      batch.map((journey, batchIndex) =>
        replayJourney(
          browser,
          baseUrl,
          demoRunId,
          journey,
          offset + batchIndex,
        ),
      ),
    );
    completed += batch.length;
    console.log(
      `[analytics-seed] replayed ${completed}/${journeys.length} browser journeys`,
    );
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    console.log(
      "Usage: pnpm analytics:seed -- [--apply] [--run-id <id>] [--base-url <url>]",
    );
    console.log(
      "Without --apply, prints an aggregate plan and sends nothing. Applying requires a development storefront with diagnostics enabled.",
    );
    return;
  }

  const id = runId();
  const journeys = buildAnalyticsDemoJourneys(id);
  const summary = summarizeAnalyticsDemo(journeys);
  console.log(
    `[analytics-seed] ${summary.journeys} journeys · ${summary.channels} channels · ${summary.events} planned events · run ${id}`,
  );

  if (!process.argv.includes("--apply")) {
    console.log(
      "[analytics-seed] Dry run only. Add --apply to replay the plan through the browser SDK.",
    );
    return;
  }

  const baseUrl = storefrontUrl();
  const response = await fetch(baseUrl, { redirect: "manual" }).catch(
    () => null,
  );
  if (!response || response.status >= 500) {
    throw new Error(
      `No healthy storefront at ${baseUrl.origin}. Start it with pnpm dev or pass --base-url.`,
    );
  }

  const browser = await chromium.launch({ headless: true });
  try {
    await replayInBatches(browser, baseUrl, id, journeys);
  } finally {
    await browser.close();
  }

  console.log(
    `[analytics-seed] completed run ${id}; use demo_run_id on the first funnel step to isolate it`,
  );
}

main().catch((error: unknown) => {
  console.error(
    `[analytics-seed] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
