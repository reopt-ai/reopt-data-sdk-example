import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * The "record now, send later" half of the SDK's identity story.
 *
 * A request writes what happened plus the visitor's device id; a separate
 * process (`scripts/forward.ts`) sends them as one batch with a per-row
 * `identity.deviceId`, and ingest files each row under the right visitor.
 *
 * A JSON file rather than the module-scope store, because the forwarder is a
 * different process and would otherwise see an empty array.
 */

export interface OutboxRow {
  id: string;
  name: string;
  /** Whose event this is. `null` when the request carried no identity. */
  deviceId: string | null;
  profileId: string | null;
  properties: Record<string, unknown>;
  recordedAt: string;
  forwardedAt: string | null;
}

const FILE = join(process.cwd(), ".sdk-local", "outbox.json");

function read(): OutboxRow[] {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as OutboxRow[];
  } catch {
    return [];
  }
}

function write(rows: OutboxRow[]): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(rows, null, 2)}\n`);
}

export function appendOutbox(
  row: Omit<OutboxRow, "id" | "recordedAt" | "forwardedAt">,
): OutboxRow {
  const rows = read();
  const entry: OutboxRow = {
    ...row,
    id: `obx_${rows.length + 1}_${Date.now().toString(36)}`,
    recordedAt: new Date().toISOString(),
    forwardedAt: null,
  };
  rows.push(entry);
  write(rows);
  return entry;
}

/** Only rows for orders the current visitor is already allowed to inspect. */
export function listOutboxForOrders(orderIds: readonly string[]): OutboxRow[] {
  const allowed = new Set(orderIds);
  return read().filter((row) => {
    const orderId = row.properties.order_id;
    return typeof orderId === "string" && allowed.has(orderId);
  });
}
