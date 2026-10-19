import { readFileSync } from "node:fs";

/** Draining is available only for this run's disposable loopback fixture. */
export async function drainIsolatedFixture(): Promise<void> {
  const path = process.env.REOPT_ROUNDTRIP_TEST_FIXTURE;
  if (!path) return;
  const fixture = JSON.parse(readFileSync(path, "utf8")) as {
    runId: string;
    baseUrl: string;
    environment: { CRON_SECRET: string };
  };
  if (
    !process.env.E2E_RUN_ID ||
    fixture.runId !== process.env.E2E_RUN_ID ||
    fixture.baseUrl !== process.env.REOPT_DATA_BASE_URL ||
    new URL(fixture.baseUrl).hostname !== "127.0.0.1"
  )
    throw new Error("Refusing to drain a non-isolated analytics environment");
  for (const route of ["process-ingest?limit=100", "rollups/refresh"]) {
    const deadline = Date.now() + 30_000;
    for (;;) {
      const response = await fetch(`${fixture.baseUrl}/api/cron/${route}`, {
        headers: { authorization: `Bearer ${fixture.environment.CRON_SECRET}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error(`Isolated materialization failed (${response.status})`);
      const body = (await response.json()) as {
        skipped?: boolean;
        remaining?: number;
        processing?: number;
        deadLetterQueueSize?: number;
        refresh?: { errors?: number };
      };
      if (
        (body.deadLetterQueueSize ?? 0) > 0 ||
        (body.refresh?.errors ?? 0) > 0
      )
        throw new Error("Isolated materialization reported failed tasks");
      if (!body.skipped && !(body.remaining ?? 0) && !(body.processing ?? 0))
        break;
      if (Date.now() >= deadline)
        throw new Error(
          "Isolated materialization did not settle within 30 seconds",
        );
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
