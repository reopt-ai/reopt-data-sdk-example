import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { addToCart, setFlags, waitForHydration } from "./fixtures";

test.describe("security boundaries", () => {
  test("orders are isolated to the browser that created them", async ({
    browser,
    baseURL,
  }) => {
    const contextOptions = baseURL ? { baseURL } : {};
    const ownerContext = await browser.newContext(contextOptions);
    const visitorContext = await browser.newContext(contextOptions);
    const owner = await ownerContext.newPage();
    const visitor = await visitorContext.newPage();

    try {
      await setFlags(owner, "noWriteKey");
      await owner.goto("/products/aster-65");
      await waitForHydration(owner);
      await addToCart(owner);
      await owner.goto("/checkout");
      await waitForHydration(owner);
      await owner.getByTestId("email").fill("owner@example.com");
      await owner.getByTestId("place-order").click();
      await expect(owner.getByTestId("order-summary")).toBeVisible();

      const successUrl = owner.url();
      expect(successUrl).toContain("/checkout/success?order=");

      await visitor.goto(successUrl);
      await expect(visitor.getByText("Order not found")).toBeVisible();
      await expect(visitor.getByTestId("order-summary")).toHaveCount(0);

      await visitor.goto("/orders");
      await expect(visitor.getByText("No orders yet")).toBeVisible();
      await expect(visitor.getByText("owner@example.com")).toHaveCount(0);
    } finally {
      await ownerContext.close();
      await visitorContext.close();
    }
  });

  test("the order API rejects a forged browser identity", async ({ page }) => {
    await setFlags(page, "noWriteKey");
    await page.goto("/products/field-deskmat");
    await waitForHydration(page);
    await addToCart(page);

    const result = await page.evaluate(async (deviceId) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "visitor@example.com", deviceId }),
      });
      return { status: response.status, body: await response.json() };
    }, randomUUID());

    expect(result).toEqual({
      status: 400,
      body: { error: "identity_mismatch" },
    });

    await page.goto("/cart");
    await expect(page.getByTestId("cart-lines")).toBeVisible();
  });

  test("the order API rejects malformed input", async ({ request }) => {
    const response = await request.post("/api/orders", {
      data: { email: "not-an-email", deviceId: "not-a-uuid" },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_body" });
  });

  test("responses carry the repository security baseline", async ({
    request,
  }) => {
    const response = await request.get("/");

    expect(response.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers()["cross-origin-opener-policy"]).toBe(
      "same-origin",
    );
    expect(response.headers()["permissions-policy"]).toContain("camera=()");
    expect(response.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers()["strict-transport-security"]).toBe(
      "max-age=31536000",
    );
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["x-powered-by"]).toBeUndefined();
  });
});
