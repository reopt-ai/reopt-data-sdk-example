import { expect, test } from "@playwright/test";

test.describe("production diagnostics safety", () => {
  test("diagnostic UI and browser recorder are absent by default", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Lab" })).toHaveCount(0);
    await expect(page.getByTestId("devtools-open")).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => typeof window.__reoptDevtools))
      .toBe("undefined");
  });

  test("diagnostic routes return 404 by default", async ({ page, request }) => {
    const lab = await page.goto("/lab");
    expect(lab?.status()).toBe(404);

    const boom = await request.get("/api/boom");
    expect(boom.status()).toBe(404);
  });
});
