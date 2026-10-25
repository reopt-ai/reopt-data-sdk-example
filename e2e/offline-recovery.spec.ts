import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  batches,
  hasLiveTenant,
  NO_LIVE_TENANT_REASON,
  waitForHydration,
} from "./fixtures";
import { REOPT_SCENARIOS } from "../lib/reopt/scenarios";

test("two offline tabs recover both events once after both documents close", async ({
  page,
  context,
}) => {
  // Recovery is only proven by accepted batches, which need a real project.
  test.skip(!hasLiveTenant(), NO_LIVE_TENANT_REASON);
  const runId = randomUUID();
  const path = `/lab?demoRunId=${runId}`;
  await page.goto(path);
  await waitForHydration(page);
  const other = await context.newPage();
  await other.goto(path);
  await waitForHydration(other);
  await context.setOffline(true);
  try {
    await page.getByTestId("send-sample-event").click();
    await other.getByTestId("send-sample-event").click();
    const saved = await page.evaluate(
      (id) =>
        Object.keys(localStorage)
          .filter((key) => key.includes("queue:v2:"))
          .map(
            (key) =>
              JSON.parse(localStorage.getItem(key)!) as {
                event: {
                  eventId: string;
                  payload?: { properties?: { demo_run_id?: string } };
                };
              },
          )
          .filter(({ event }) => event.payload?.properties?.demo_run_id === id)
          .map(({ event }) => event.eventId),
      runId,
    );
    expect(saved).toHaveLength(2);
    await page.close();
    await other.close();
    await context.setOffline(false);
    const recovered = await Promise.all([context.newPage(), context.newPage()]);
    await Promise.all(
      recovered.map(async (tab) => {
        await tab.goto(path);
        await waitForHydration(tab);
      }),
    );
    const delivered = async () =>
      (await Promise.all(recovered.map(batches)))
        .flat()
        .filter((batch) => batch.ok)
        .flatMap((batch) => batch.events)
        .filter(
          (event) =>
            event.payload?.name === REOPT_SCENARIOS.roundtrip.eventName &&
            event.payload.properties?.demo_run_id === runId,
        )
        .map((event) => event.eventId)
        .sort();
    await expect.poll(delivered).toEqual(saved.sort());
    for (const tab of recovered) {
      await tab.getByTestId("flush-now").click();
    }
    await expect
      .poll(() =>
        recovered[0]!.evaluate(
          (ids) =>
            Object.keys(localStorage).filter((key) =>
              ids.some((id) => key.includes(`queue:v2:${id}:`)),
            ).length,
          saved,
        ),
      )
      .toBe(0);
    expect(await delivered()).toEqual(saved.sort());
  } finally {
    await context.setOffline(false);
  }
});
