import { expect, test } from "@playwright/test";

import {
  batches,
  hasTenant,
  navigate,
  NO_TENANT_REASON,
  setFlags,
  waitForEvent,
} from "./fixtures";

/**
 * The parts of the integration that are easy to get wrong and impossible to
 * see in a dashboard until much later: what a path is called, which properties
 * ride along on the automatic events, and who owns the page view.
 */
test.describe("analytics contract", () => {
  test.skip(!hasTenant(), NO_TENANT_REASON);

  test("normalizePath is applied consistently to every path event", async ({
    page,
  }) => {
    await setFlags(page, "autoPageview");
    await page.goto("/products/murmur-buds");

    const vital = await waitForEvent(page, "$web_vitals");
    // The SDK stamps this path itself, so `normalizePath` runs: the slug is
    // collapsed out of `path` and lifted into a property.
    expect(vital.payload?.properties?.path).toBe("/products/:slug");
    expect(vital.payload?.properties?.product_slug).toBe("murmur-buds");

    // `<ReoptPageView />` hands the runtime the query string and lets it stamp
    // the path, so the same rule applies here. Keeping page-view ownership in
    // one place prevents this event from diverging from the automatic events.
    const pageview = await waitForEvent(page, "$pageview");
    expect(pageview.payload?.properties?.path).toBe("/products/:slug");
    expect(pageview.payload?.properties?.product_slug).toBe("murmur-buds");

    const productViewed = await waitForEvent(page, "product.viewed");
    expect(productViewed.payload?.properties).toMatchObject({
      product_slug: "murmur-buds",
      category: "audio",
      price_band: "core",
      currency: "KRW",
      funnel_stage: "viewed",
    });

    // `$pageleave` inherits the page view's path, so it agrees too.
    await navigate(page, /Cart/);
    const leave = await waitForEvent(page, "$pageleave");
    expect(leave.payload?.properties?.path).toBe("/products/:slug");
  });

  test("disabling automatic page views emits exactly one manual page view", async ({
    page,
  }) => {
    await setFlags(page, "");
    await page.goto("/products/aster-65");

    const pageview = await waitForEvent(page, "$pageview");
    expect(pageview.payload?.properties?.path).toBe("/products/:slug");
    expect(pageview.payload?.properties?.product_id).toBe("p_kb_65");

    const all = (await batches(page)).flatMap((batch) => batch.events);
    const count = all.filter(
      (event) => event.payload?.name === "$pageview",
    ).length;
    expect(count, "manual and automatic page views must not overlap").toBe(1);
  });

  test("register() properties propagate to later automatic events", async ({
    page,
  }) => {
    await setFlags(page, "autoPageview");
    await page.goto("/products/halo-desk-lamp");
    await waitForEvent(page, "$pageview");

    await navigate(page, /Cart/);
    const leave = await waitForEvent(page, "$pageleave");
    expect(leave.payload?.properties?.page_id).toBe("product:halo-desk-lamp");
  });
});
