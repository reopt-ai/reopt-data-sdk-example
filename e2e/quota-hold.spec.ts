import { expect, test, type Page } from "@playwright/test";
import {
  CONTRACT_VERSION,
  CONTRACT_VERSION_HEADER,
  INGEST_CAPABILITIES_HEADER,
  INGEST_CAPABILITY_DEFERRED,
} from "@reopt-ai/data-contract/identity";

import { batches, waitForHydration } from "./fixtures";

/**
 * A spent quota does not clear on a retry schedule, so the SDK stops sending
 * until `Retry-After` instead of hammering ingest. Ingest is stubbed here: a
 * real project cannot be driven into its quota on demand.
 */
const TRACK = "**/ingest/api/track";

async function sendAndFlush(page: Page, times: number): Promise<void> {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await page.getByTestId("send-sample-event").click();
    await page.getByTestId("flush-now").click();
  }
}

test.describe("quota hold", () => {
  test("a quota refusal stops delivery until Retry-After", async ({ page }) => {
    let requests = 0;
    await page.route(TRACK, (route) => {
      requests += 1;
      return route.fulfill({
        status: 429,
        headers: { "retry-after": "3600" },
        contentType: "application/json",
        body: JSON.stringify({
          code: "quota_exceeded",
          error: "Too Many Requests",
          message: "Data point quota exceeded",
        }),
      });
    });
    await page.goto("/lab");
    await waitForHydration(page);

    await sendAndFlush(page, 1);
    await expect.poll(() => requests).toBe(1);
    await sendAndFlush(page, 3);
    // Longer than the batch interval and the first retry delay, so either a
    // scheduled flush or a retry would have reached the stub by now.
    await page.waitForTimeout(2_500);
    expect(requests, "the SDK must wait out Retry-After").toBe(1);
    const [refused] = await batches(page);
    expect(refused?.status).toBe(429);
  });

  test("a partially accepted batch reports its deferred rows and holds them", async ({
    page,
  }) => {
    let requests = 0;
    await page.route(TRACK, (route) => {
      requests += 1;
      const rows = route.request().postDataJSON() as { eventId: string }[];
      const [held, ...accepted] = rows;
      return route.fulfill({
        status: 200,
        headers: { [CONTRACT_VERSION_HEADER]: CONTRACT_VERSION },
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          accepted: accepted.length,
          duplicates: 0,
          rejected: [],
          deferred: [{ eventId: held!.eventId, reason: "quota_exceeded" }],
        }),
      });
    });
    await page.goto("/lab");
    await waitForHydration(page);

    await sendAndFlush(page, 1);
    await expect.poll(() => requests).toBe(1);
    const [partial] = await batches(page);
    // The SDK announces that it keeps deferred rows; without that, ingest
    // refuses the whole batch instead of taking part of it.
    expect(partial?.headers[INGEST_CAPABILITIES_HEADER]).toContain(
      INGEST_CAPABILITY_DEFERRED,
    );
    expect(partial?.deferred).toBe(1);

    await sendAndFlush(page, 2);
    await page.waitForTimeout(2_500);
    expect(requests, "deferred rows wait out the quota hold").toBe(1);
  });
});
