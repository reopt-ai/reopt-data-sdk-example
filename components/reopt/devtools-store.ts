"use client";

import type { FetchInit, FetchResponseLike } from "@reopt-ai/data-sdk-client";

/**
 * Everything the devtools drawer shows, recorded from the one place the SDK
 * lets you stand: its `fetch`.
 *
 * `ReoptClientConfig.fetch` is a first-class option, so this needs no network
 * interception and no patched globals — the SDK calls straight through here,
 * and what we record is the exact payload it built. The Playwright specs read
 * the same store off `window`, for the same reason.
 *
 * The store is deliberately not React state: batches arrive from a timer while
 * the drawer is closed, and re-rendering the shop for each one would make the
 * instrument change what it measures.
 */

export interface RecordedBatch {
  id: number;
  at: number;
  url: string;
  /** Request headers the SDK set, credentials included — this is a local demo tool. */
  headers: Record<string, string>;
  events: RecordedEvent[];
  status: number | null;
  ok: boolean;
  durationMs: number;
  /** Parsed response body, or the raw text when it is not JSON. */
  response: unknown;
  error?: string;
}

/**
 * One event as it goes on the wire: a discriminated envelope whose `payload`
 * carries the name and the properties. The batch body is a bare array of these.
 */
export interface RecordedEvent {
  type: string;
  eventId?: string;
  timestamp?: number;
  payload?: {
    name?: string;
    properties?: Record<string, unknown>;
    profileId?: string | number;
  };
}

/** The event name, which for identify/increment lives in the envelope's type. */
export function eventLabel(event: RecordedEvent): string {
  return event.payload?.name ?? event.type ?? "?";
}

export interface DevtoolsState {
  batches: RecordedBatch[];
  /** Sent batches / events, since the page loaded. */
  totals: { batches: number; events: number; failed: number };
}

const MAX_BATCHES = 40;

let state: DevtoolsState = {
  batches: [],
  totals: { batches: 0, events: 0, failed: 0 },
};
const listeners = new Set<() => void>();
let nextId = 1;

function publish(next: DevtoolsState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): DevtoolsState {
  return state;
}

/** Server snapshot for `useSyncExternalStore` — nothing has been sent during SSR. */
export const EMPTY_STATE: DevtoolsState = {
  batches: [],
  totals: { batches: 0, events: 0, failed: 0 },
};
export function getServerSnapshot(): DevtoolsState {
  return EMPTY_STATE;
}

export function clearBatches(): void {
  publish({ ...state, batches: [] });
}

function record(batch: RecordedBatch): void {
  publish({
    batches: [batch, ...state.batches].slice(0, MAX_BATCHES),
    totals: {
      batches: state.totals.batches + 1,
      events: state.totals.events + batch.events.length,
      failed: state.totals.failed + (batch.ok ? 0 : 1),
    },
  });
}

function parseEvents(body: string): RecordedEvent[] {
  try {
    const parsed = JSON.parse(body) as RecordedEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The transport handed to the SDK. It delegates to the page's `fetch` and
 * records both sides.
 *
 * The body is read here and replayed through `text()`, because a `Response`
 * body can only be consumed once and the SDK needs it to learn its session
 * credential.
 */
export async function recordingFetch(
  input: string,
  init: FetchInit,
): Promise<FetchResponseLike> {
  const startedAt = Date.now();
  const events = parseEvents(init.body);

  try {
    const response = await fetch(input, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      ...(init.keepalive ? { keepalive: true } : {}),
    });
    const text = await response.text();

    record({
      id: nextId++,
      at: startedAt,
      url: input,
      headers: init.headers,
      events,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - startedAt,
      response: parseBody(text),
    });

    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      text: async () => text,
    };
  } catch (error) {
    record({
      id: nextId++,
      at: startedAt,
      url: input,
      headers: init.headers,
      events,
      status: null,
      ok: false,
      durationMs: Date.now() - startedAt,
      response: null,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

declare global {
  interface Window {
    /** Read by the Playwright specs. Same data as the drawer. */
    __reoptDevtools?: {
      state: () => DevtoolsState;
      clear: () => void;
    };
  }
}

export function exposeOnWindow(): void {
  if (typeof window === "undefined") return;
  window.__reoptDevtools = { state: getSnapshot, clear: clearBatches };
}
