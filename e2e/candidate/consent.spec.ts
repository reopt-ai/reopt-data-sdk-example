import { expect, test } from "@playwright/test";
import { REOPT_SCENARIOS } from "../../lib/reopt/scenarios";
import { events, waitForEvent, waitForHydration } from "../fixtures";

test("withdrawal discards a queued event instead of reviving it on re-grant", async ({
  page,
}) => {
  await page.goto(`/lab?demoRunId=${crypto.randomUUID()}`);
  await waitForHydration(page);
  await page.evaluate(() => window.__reoptDevtools?.clear());
  // Both user actions run in one browser task, before the SDK's batch timer.
  await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('[data-testid="send-sample-event"]')!
      .click();
    document
      .querySelector<HTMLButtonElement>('[data-testid="toggle-consent"]')!
      .click();
  });
  await expect(page.getByTestId("toggle-consent")).toHaveText(
    "Allow analytics",
  );
  await page.getByTestId("toggle-consent").click();
  await page.getByTestId("flush-now").click();
  await page.getByTestId("send-sample-event").click();
  await page.getByTestId("flush-now").click();
  await waitForEvent(page, REOPT_SCENARIOS.roundtrip.eventName);
  expect(
    (await events(page)).filter(
      (event) => event.payload?.name === REOPT_SCENARIOS.roundtrip.eventName,
    ),
  ).toHaveLength(1);
});
