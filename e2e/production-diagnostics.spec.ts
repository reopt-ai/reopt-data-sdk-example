import { expect, test } from "@playwright/test";

test("an explicit production opt-in enables diagnostics", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Lab" }).first()).toBeVisible();
  await page.waitForFunction(() => window.__reoptDevtools !== undefined);
  await expect(page.getByTestId("devtools-open")).toBeVisible();
  await expect(page.getByTestId("devtools-panel")).toHaveCount(0);
  await page.getByTestId("devtools-open").click();
  await expect(page.getByTestId("devtools-panel")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  const lab = await page.goto("/lab");
  expect(lab?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Instrumentation lab" }),
  ).toBeVisible();
});
