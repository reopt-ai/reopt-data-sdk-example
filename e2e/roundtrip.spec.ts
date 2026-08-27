import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { REOPT_SCENARIOS } from "../lib/reopt/scenarios";
import {
  batches,
  NO_TENANT_REASON,
  roundtripTenant,
  waitForHydration,
  type RecordedBatch,
} from "./fixtures";

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function ingestRequestId(batch: RecordedBatch | undefined): string | null {
  if (!batch) return null;
  const direct = (batch as RecordedBatch & { requestId?: unknown }).requestId;
  if (typeof direct === "string") return direct;
  if (!batch.response || typeof batch.response !== "object") return null;
  const value = (batch.response as { requestId?: unknown }).requestId;
  return typeof value === "string" ? value : null;
}

test.describe("browser to query roundtrip", () => {
  const tenant = roundtripTenant();
  test.skip(!tenant, NO_TENANT_REASON);
  // Managed Vercel Queue delivery can legitimately take around 30 seconds
  // from an idle consumer. Keep the ingest acceptance assertion fast, but
  // give the materialized analytics read enough room to cross that boundary.
  test.setTimeout(150_000);

  test("correlates one browser event through ingest and materialized query data", async ({
    page,
  }, testInfo) => {
    if (!tenant) return;
    const runId = randomUUID();
    await page.goto(`/lab?demoRunId=${runId}`);
    await waitForHydration(page);
    await page.evaluate(() => window.__reoptDevtools?.clear());
    await page.getByTestId("send-sample-event").click();
    await page.getByTestId("flush-now").click();

    await expect
      .poll(
        async () =>
          (await batches(page)).find((batch) =>
            batch.events.some(
              (event) =>
                event.payload?.name === REOPT_SCENARIOS.roundtrip.eventName &&
                event.payload.properties?.[
                  REOPT_SCENARIOS.roundtrip.runIdProperty
                ] === runId,
            ),
          ),
        {
          timeout: 20_000,
          message: "the run-tagged lab event was not accepted by ingest",
        },
      )
      .toMatchObject({ ok: true, status: 200 });

    const ingestBatch = (await batches(page)).find((batch) =>
      batch.events.some(
        (event) =>
          event.payload?.properties?.[
            REOPT_SCENARIOS.roundtrip.runIdProperty
          ] === runId,
      ),
    );
    const ingestId = ingestRequestId(ingestBatch);
    expect(ingestId).toBeTruthy();

    let queryRequestId: string | undefined;
    await expect
      .poll(
        async () => {
          const now = new Date();
          // Use Node fetch instead of Playwright's request fixture. Playwright
          // includes request headers in connection-error reports, which would
          // disclose the server credential when a deployment URL is wrong.
          const response = await fetch(
            `${tenant.baseUrl}/api/v1/query/events/timeseries`,
            {
              method: "POST",
              headers: {
                "cache-control": "no-cache",
                "content-type": "application/json",
                "reopt-client-id": tenant.clientId,
                "reopt-client-secret": tenant.clientSecret,
              },
              body: JSON.stringify({
                projectId: tenant.projectId,
                startDate: dateOnly(new Date(now.getTime() - 86_400_000)),
                endDate: dateOnly(new Date(now.getTime() + 86_400_000)),
                granularity: "hour",
                eventName: REOPT_SCENARIOS.roundtrip.eventName,
                propertyFilters: [
                  {
                    key: REOPT_SCENARIOS.roundtrip.runIdProperty,
                    value: runId,
                  },
                ],
                timezone: "UTC",
              }),
            },
          );
          expect(response.ok, `Query API returned ${response.status}`).toBe(
            true,
          );
          const body = (await response.json()) as {
            data?: { series?: Array<{ count?: number }> };
            meta?: { requestId?: string };
          };
          queryRequestId = body.meta?.requestId;
          return (
            body.data?.series?.reduce(
              (sum, point) => sum + (point.count ?? 0),
              0,
            ) ?? 0
          );
        },
        {
          timeout: 120_000,
          intervals: [250, 500, 1_000, 2_000],
          message: "ingest data did not materialize",
        },
      )
      .toBeGreaterThan(0);

    expect(queryRequestId).toBeTruthy();
    testInfo.annotations.push(
      { type: "runId", description: runId },
      { type: "ingestRequestId", description: ingestId ?? "missing" },
      { type: "queryRequestId", description: queryRequestId ?? "missing" },
    );
  });
});
