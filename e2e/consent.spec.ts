import { expect, test } from "@playwright/test";

import {
  deviceCookie,
  hasTenant,
  NO_TENANT_REASON,
  setFlags,
} from "./fixtures";

/**
 * Refusing consent has to mean "forget me", not just "stop sending" — so the
 * spec checks the server too, not only that no batch went out.
 */
test.describe("consent", () => {
  test.skip(!hasTenant(), NO_TENANT_REASON);

  test("denial is persisted, stops delivery, and forgets the device", async ({
    page,
  }) => {
    await setFlags(page, "externalConsent,autoPageview");
    await page.goto("/");

    await expect(page.getByTestId("consent-banner")).toBeVisible();
    expect(
      await deviceCookie(page),
      "the proxy should seed the device before the banner appears",
    ).not.toBeNull();

    await page.getByTestId("consent-deny").click();
    await expect(page.getByTestId("consent-banner")).toBeHidden();

    // The banner told the server. With `consent.persist: false` the SDK keeps
    // no cookie of its own, so this is the only record the proxy can read.
    const cookies = await page.context().cookies();
    const consent = cookies.find((cookie) => cookie.name.endsWith("_consent"));
    expect(
      consent?.value,
      "denial should be persisted by the server",
    ).toContain("false");

    await page.goto("/products");
    const after = await page.evaluate(
      () => window.__reoptDevtools?.state().totals.events ?? 0,
    );
    expect(after, "no events should be delivered after denial").toBe(0);
  });

  test("the proxy does not reseed a device for a visitor who denied consent", async ({
    request,
  }) => {
    // Server-side proof, with no browser in the way: a request that carries only
    // the opt-out must come back without a device cookie.
    const probe = await request.get("/products", {
      headers: { cookie: "shop_sdk_flags=externalConsent" },
    });
    const seeded = probe
      .headersArray()
      .filter((header) => header.name.toLowerCase() === "set-cookie");
    const deviceSeed = seeded.find((header) =>
      header.value.includes("_device="),
    );
    expect(
      deviceSeed,
      "the first pre-consent visit should seed a device",
    ).toBeDefined();

    const writeKey = /reopt_(wpk_[a-z0-9]+)_device=/.exec(
      deviceSeed!.value,
    )?.[1];
    expect(writeKey).toBeDefined();

    const optedOut = await request.get("/products", {
      headers: {
        cookie: `reopt_${writeKey}_consent=%7B%22analytics%22%3Afalse%7D`,
      },
    });
    const reseeded = optedOut
      .headersArray()
      .filter((header) => header.name.toLowerCase() === "set-cookie")
      .find((header) => header.value.includes("_device="));
    expect(
      reseeded,
      "an opted-out visitor must not be reseeded",
    ).toBeUndefined();
  });

  test("the banner stays dismissed after consent is granted", async ({
    page,
  }) => {
    await setFlags(page, "externalConsent,autoPageview");
    await page.goto("/");
    await page.getByTestId("consent-allow").click();
    await expect(page.getByTestId("consent-banner")).toBeHidden();

    await page.goto("/products");
    await expect(page.getByTestId("consent-banner")).toBeHidden();
  });
});
