import { expect, test } from "@playwright/test";

import { addToCart, setFlags, waitForHydration } from "./fixtures";

/**
 * Analytics must never be why the shop breaks.
 *
 * No tenant fixture: this is the one suite that is *supposed* to run without
 * credentials, because that is the failure it describes.
 */
test.describe("fail-open", () => {
  test("the shop remains functional without a write key", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await setFlags(page, "noWriteKey,autoPageview");
    await page.goto("/products/aster-65");
    await waitForHydration(page);

    await expect(page.getByTestId("add-to-cart")).toBeVisible();
    await addToCart(page);
    await page.goto("/cart");
    await expect(page.getByTestId("cart-lines")).toBeVisible();
    await expect(page.getByTestId("cart-total")).toBeVisible();

    expect(
      consoleErrors,
      "a disabled SDK must not cause an unhandled page error",
    ).toEqual([]);

    const totals = await page.evaluate(
      () => window.__reoptDevtools?.state().totals,
    );
    expect(totals?.batches, "a disabled client must not send batches").toBe(0);
    expect(totals?.events, "a disabled client must not send events").toBe(0);
  });

  test("checkout exposes the absence of a device ID without inventing one", async ({
    page,
  }) => {
    await setFlags(page, "noWriteKey");
    await page.goto("/products/field-deskmat");
    await waitForHydration(page);
    await addToCart(page);
    await page.goto("/checkout");
    await waitForHydration(page);

    // Not a crash and not a fake id: the page says it has none.
    await expect(page.getByTestId("checkout-device-id")).toContainText("none");

    // Guest checkout: the email is `required`, and an empty one makes the
    // browser refuse the submit without a word.
    await page.getByTestId("email").fill("guest@example.com");
    await page.getByTestId("place-order").click();
    await expect(page.getByTestId("order-summary")).toBeVisible();
  });
});
