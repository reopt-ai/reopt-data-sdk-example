/**
 * Send locally persisted outbox rows from a separate worker process.
 *
 * This command is a development demonstration. Production uses process memory
 * so analytics can never make checkout depend on a writable filesystem; a real
 * application should replace this file with its durable queue or database.
 */
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createReoptNode } from "@reopt-ai/data-sdk-server/node";
import nextEnv from "@next/env";

import { DEFAULT_REOPT_DATA_BASE_URL } from "../lib/reopt/tenants";

interface OutboxRow {
  id: string;
  name: string;
  deviceId: string | null;
  profileId: string | null;
  properties: Record<string, unknown>;
  recordedAt: string;
  forwardedAt: string | null;
}

const OUTBOX = join(process.cwd(), ".reopt-example", "outbox.json");

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function main(): Promise<void> {
  nextEnv.loadEnvConfig(process.cwd());
  const clientId = process.env.REOPT_DATA_CLIENT_ID;
  const clientSecret = process.env.REOPT_DATA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      "[forward] Set REOPT_DATA_CLIENT_ID and REOPT_DATA_CLIENT_SECRET in your local environment.",
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
    clientId,
    clientSecret,
    baseUrl: process.env.REOPT_DATA_BASE_URL ?? DEFAULT_REOPT_DATA_BASE_URL,
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
      ...(row.deviceId ? { identity: { deviceId: row.deviceId } } : {}),
    });
    console.log(`[forward] ${row.name} · device ${row.deviceId ?? "none"}`);
  }

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
      { mode: 0o600 },
    );
    chmodSync(OUTBOX, 0o600);
  }
}

main().catch((error: unknown) => {
  console.error(
    `[forward] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
