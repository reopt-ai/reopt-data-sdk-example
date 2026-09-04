import { expect, test } from "@playwright/test";

import {
  addToCart,
  deviceCookie,
  events,
  hasTenant,
  NO_TENANT_REASON,
  setFlags,
  waitForEvent,
  waitForHydration,
} from "./fixtures";

/**
 * The whole journey, asserted on the events it produces: land, browse, add to
 * cart, sign in, order — and the one thing that ties them together, which is
 * that every event names the same device.
 */
test.describe("shopping journey", () => {
  test.skip(!hasTenant(), NO_TENANT_REASON);

  test("one seeded device connects the first page view through the order", async ({
    page,
  }) => {
    await setFlags(page, "autoPageview");
    await page.goto("/");

    // Seeded by the proxy, before the page rendered.
    const seeded = await deviceCookie(page);
    expect(seeded, "the proxy should seed a device cookie").not.toBeNull();

    const pageview = await waitForEvent(page, "$pageview");
    expect(pageview.payload?.properties?.path).toBe("/");
    // From `init({ properties })` — present on the very first event.
    expect(pageview.payload?.properties?.shop_surface).toBe("web");

    await page.goto("/products/aster-65");
    await waitForHydration(page);
    await addToCart(page);

    const added = await waitForEvent(page, "cart.added");
    expect(added.payload?.properties).toMatchObject({
      product_id: "p_kb_65",
      product_slug: "aster-65",
      category: "keyboard",
      price_band: "core",
      currency: "KRW",
      funnel_stage: "cart",
    });

    // Sign in: the browser announces the profile, the server confirms it.
    await page.goto("/account");
    await waitForHydration(page);
    await page.getByTestId("sign-in").click();
    await expect(page.getByTestId("account-name")).toBeVisible();

    // `identify()` travels as its own envelope type, not as a named track event.
    await expect
      .poll(
        async () =>
          (await events(page)).some((event) => event.type === "identify"),
        {
          timeout: 15_000,
          message: "sign-in should send an identify envelope",
        },
      )
      .toBe(true);

    // Order, confirmed by the server.
    await page.goto("/checkout");
    await waitForHydration(page);
    const checkoutStarted = await waitForEvent(page, "checkout.started");
    expect(checkoutStarted.payload?.properties).toMatchObject({
      currency: "KRW",
      item_count: 1,
      value_band: "100k_to_249k",
      funnel_stage: "checkout",
    });
    const shownDeviceId = await page
      .getByTestId("checkout-device-id")
      .textContent();
    expect(
      shownDeviceId,
      "checkout should expose the verified device ID",
    ).toMatch(/^[0-9a-f-]{20,}$/);

    await page.getByTestId("place-order").click();
    await expect(page.getByTestId("order-summary")).toBeVisible();

    const submitted = await waitForEvent(page, "checkout.submitted");
    expect(submitted.payload?.properties).toMatchObject({
      mode: "server-action",
      currency: "KRW",
      item_count: 1,
      value_band: "100k_to_249k",
      funnel_stage: "submitted",
    });

    // The device the order was filed under is the one the page was tracked with.
    await expect(page.getByTestId("order-summary")).toContainText(
      shownDeviceId!.trim(),
    );

    // The seeded identity survived the whole journey.
    expect(await deviceCookie(page)).not.toBeNull();
  });

  test("ingest accepts every emitted batch", async ({ page }) => {
    await setFlags(page, "autoPageview");
    await page.goto("/products");
    await waitForEvent(page, "$pageview");

    const totals = await page.evaluate(
      () => window.__reoptDevtools?.state().totals,
    );
    expect(totals?.failed, "no batch should fail delivery").toBe(0);
    expect(totals?.batches).toBeGreaterThan(0);
  });
});
