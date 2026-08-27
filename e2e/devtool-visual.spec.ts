import { expect, test } from "@playwright/test";

test("new event cards reveal once on phase-colored surfaces", async ({
  page,
}) => {
  await page.goto("/lab");
  await page.waitForFunction(() => window.__reoptDevtools !== undefined);
  await page.getByTestId("devtools-open").click();
  await expect(page.getByTestId("devtools-events")).toBeVisible();
  await page.getByRole("button", { name: "Clear" }).click();

  // The expanded bottom sheet intentionally covers page controls. Dispatch
  // through the DOM so the panel remains mounted while the event arrives.
  await page
    .getByTestId("send-sample-event")
    .evaluate((button) => (button as HTMLButtonElement).click());
  const card = page.locator(".rdt-event-card").first();
  await expect(card).toBeVisible();
  await expect(card).toHaveClass(/rdt-event-enter/);

  const initialVisual = await card.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderStyle: style.borderStyle,
    };
  });
  expect(initialVisual.borderStyle).toBe("none");
  expect(initialVisual.backgroundColor).not.toBe("rgb(27, 29, 32)");

  await page
    .getByTestId("flush-now")
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(card).toHaveAttribute("data-phase", /accepted|failed/);
  await expect(card).not.toHaveClass(/rdt-event-enter/, { timeout: 2_000 });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByTestId("send-sample-event")
    .evaluate((button) => (button as HTMLButtonElement).click());
  const newest = page.locator(".rdt-event-card").first();
  await expect(newest).toHaveClass(/rdt-event-enter/);
  expect(
    await newest.evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
});
