import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { setFlags } from "./fixtures";

const PUBLIC_ROUTES = ["/", "/products", "/products/aster-65", "/account"];

test.describe("storefront quality", () => {
  test.beforeEach(async ({ page }) => {
    await setFlags(page, "noWriteKey");
  });

  test("generated storefront imagery loads at its rendered size", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Make room for better work.",
    );

    const images = page.locator("main img");
    await expect(images).toHaveCount(5);
    for (let index = 0; index < (await images.count()); index += 1) {
      await expect
        .poll(() =>
          images.nth(index).evaluate((image: HTMLImageElement) => ({
            complete: image.complete,
            naturalWidth: image.naturalWidth,
          })),
        )
        .toMatchObject({ complete: true, naturalWidth: expect.any(Number) });
      expect(
        await images
          .nth(index)
          .evaluate((image: HTMLImageElement) =>
            Math.min(image.naturalWidth, image.naturalHeight),
          ),
      ).toBeGreaterThan(300);
    }
  });

  test("the narrow storefront has no page-level horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of ["/", "/products", "/products/aster-65", "/account"]) {
      await page.goto(route);
      await expect(page.locator("header").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `${route} should not overflow the viewport`,
      ).toBe(true);
    }
  });

  test("the skip link reaches the primary content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("publishes the generated favicon and reopt SDK social card", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "reopt Data SDK Example",
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      "reopt Data SDK Example",
    );

    const socialImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(socialImage).toContain("/opengraph-image");
    const socialResponse = await request.get(socialImage!);
    expect(socialResponse.ok()).toBe(true);
    expect(socialResponse.headers()["content-type"]).toContain("image/png");

    const iconLinks = await page
      .locator('link[rel="icon"]')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute("href") ?? ""),
      );
    expect(iconLinks.some((href) => href.includes("/favicon.ico"))).toBe(true);
    expect(iconLinks.some((href) => href.includes("/icon"))).toBe(true);
  });

  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no serious automated accessibility violations`, async ({
      page,
    }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .exclude("nextjs-portal")
        .analyze();
      const materialViolations = results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );
      expect(materialViolations).toEqual([]);
    });
  }
});
