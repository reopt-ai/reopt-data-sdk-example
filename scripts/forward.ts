/**
 * The outbox forwarder: sends what the app wrote down, later, from a separate
 * process.
 *
 *   pnpm forward
 *
 * This is the shape an app needs when the conversion is confirmed somewhere the
 * visitor's browser is not — a webhook, a nightly reconciliation, a queue
 * worker. Each row carries the device id the request recorded, and the node
 * client puts it on the event as `identity.deviceId`, so ingest files each row
 * under the right visitor even though they travel in one batch.
 *
 * `createReoptNode` rather than `createReopt`: there is no request here to read
 * a cookie from, which is exactly why the device id had to be written down.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createReoptNode } from "@reopt-ai/data-sdk-server/node";

interface OutboxRow {
  id: string;
  name: string;
  deviceId: string | null;
  profileId: string | null;
  properties: Record<string, unknown>;
  recordedAt: string;
  forwardedAt: string | null;
}

interface TenantStore {
  baseUrl: string;
  projects: { name: string; clientId: string; clientSecret: string }[];
}

const OUTBOX = join(process.cwd(), ".sdk-local", "outbox.json");
const STORE = join(process.cwd(), ".reopt-local.json");

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function main(): Promise<void> {
  const store = readJson<TenantStore | null>(STORE, null);
  const project = store?.projects[0];
  if (!store || !project?.clientId) {
    console.error(
      "[forward] Missing .reopt-local.json. Run `pnpm reopt:setup` first.",
    );
    process.exit(1);
  }

  const rows = readJson<OutboxRow[]>(OUTBOX, []);
  const pending = rows.filter((row) => row.forwardedAt === null);
  if (pending.length === 0) {
    console.log("[forward] No pending rows.");
    return;
  }

  const reopt = createReoptNode({
    clientId: project.clientId,
    clientSecret: project.clientSecret,
    baseUrl: store.baseUrl,
  });

  for (const row of pending) {
    reopt.track({
      name: row.name,
      properties: {
        ...row.properties,
        outbox_id: row.id,
        recorded_at: row.recordedAt,
      },
      ...(row.profileId ? { profileId: row.profileId } : {}),
      // Per row, not per batch: one batch may carry several visitors, and the
      // row's device wins over the batch header.
      ...(row.deviceId ? { identity: { deviceId: row.deviceId } } : {}),
    });
    console.log(`[forward] ${row.name} · device ${row.deviceId ?? "none"}`);
  }

  // Required before the process exits: it stops the timers and drains the queue.
  const result = await reopt.close();
  console.log(
    `[forward] sent ${result.sent} · failed ${result.failed} · pending ${result.pending}`,
  );

  if (result.failed === 0) {
    const forwardedAt = new Date().toISOString();
    const ids = new Set(pending.map((row) => row.id));
    writeFileSync(
      OUTBOX,
      `${JSON.stringify(
        rows.map((row) => (ids.has(row.id) ? { ...row, forwardedAt } : row)),
        null,
        2,
      )}\n`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    `[forward] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
