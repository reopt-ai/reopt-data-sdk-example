import "server-only";

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * The "record now, send later" half of the SDK's identity story.
 *
 * Production keeps demo rows in process memory: analytics persistence must
 * never make checkout depend on a writable server filesystem. Development also
 * mirrors the rows to a private local file, best-effort, so `pnpm forward` can
 * demonstrate a separate worker process.
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

const FILE = join(process.cwd(), ".reopt-example", "outbox.json");
const PERSIST_LOCALLY = process.env.NODE_ENV !== "production";

const processState = globalThis as typeof globalThis & {
  __reoptExampleOutbox?: OutboxRow[];
  __reoptExampleOutboxWarned?: boolean;
};

function rows(): OutboxRow[] {
  if (processState.__reoptExampleOutbox) {
    return processState.__reoptExampleOutbox;
  }
  processState.__reoptExampleOutbox = PERSIST_LOCALLY ? readLocal() : [];
  return processState.__reoptExampleOutbox;
}

function readLocal(): OutboxRow[] {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as OutboxRow[];
  } catch {
    return [];
  }
}

function persistLocal(entries: OutboxRow[]): void {
  if (!PERSIST_LOCALLY) return;
  try {
    mkdirSync(dirname(FILE), { recursive: true, mode: 0o700 });
    writeFileSync(FILE, `${JSON.stringify(entries, null, 2)}\n`, {
      mode: 0o600,
    });
    chmodSync(FILE, 0o600);
  } catch (error) {
    if (processState.__reoptExampleOutboxWarned) return;
    processState.__reoptExampleOutboxWarned = true;
    console.warn(
      `[outbox] Local demo persistence is unavailable; continuing in memory: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function appendOutbox(
  row: Omit<OutboxRow, "id" | "recordedAt" | "forwardedAt">,
): OutboxRow {
  const entries = rows();
  const entry: OutboxRow = {
    ...row,
    id: `obx_${entries.length + 1}_${Date.now().toString(36)}`,
    recordedAt: new Date().toISOString(),
    forwardedAt: null,
  };
  entries.push(entry);
  persistLocal(entries);
  return entry;
}

/** Only rows for orders the current visitor is already allowed to inspect. */
export function listOutboxForOrders(orderIds: readonly string[]): OutboxRow[] {
  const allowed = new Set(orderIds);
  return rows().filter((row) => {
    const orderId = row.properties.order_id;
    return typeof orderId === "string" && allowed.has(orderId);
  });
}
