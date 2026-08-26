"use client";

import { useReoptClient } from "@reopt-ai/data-sdk-client/next";
import {
  Badge,
  Button,
  DrawerPanel,
  DrawerRoot,
  Separator,
  Tab,
  TabList,
  TabPanel,
  TabsRoot,
} from "@reopt-ai/opt-ui";
import { RadioTower } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { useClientSnapshot } from "@/lib/use-client-snapshot";

import {
  FLAGS,
  FLAG_NAMES,
  FLAGS_COOKIE,
  parseFlags,
  serializeFlags,
  type FlagName,
  type Flags,
} from "@/lib/reopt/flags";
import {
  clearBatches,
  eventLabel,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "./devtools-store";

/**
 * The SDK devtools panel — what is queued, what was sent, who the browser
 * thinks it is, and which options are on.
 *
 * This is the piece that makes the app a testbed rather than a demo: an SDK
 * change is visible here within one interaction, without a dashboard round trip
 * and without reading the network tab to guess which request was a batch.
 */
export function DevtoolsDrawer() {
  const [open, setOpen] = useState(false);
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <>
      <Button
        className="fixed right-3 bottom-3 z-30 rounded-full shadow-[var(--opt-shadow-md)] sm:right-4 sm:bottom-4"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="devtools-open"
      >
        <RadioTower className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">SDK devtools</span>
        <Badge
          className="ml-2"
          variant={state.totals.failed > 0 ? "error" : "info"}
        >
          {state.totals.events}
        </Badge>
      </Button>

      {/* `animated={false}`: the underlying dialog waits for an animation that
          never arrives otherwise and the panel freezes on open. */}
      <DrawerRoot open={open} onOpenChange={setOpen} animated={false}>
        <DrawerPanel side="right" size="lg">
          <div className="flex h-full flex-col gap-4 p-6">
            <header className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">SDK devtools</h2>
              <Badge variant="info">batches {state.totals.batches}</Badge>
              <Badge variant={state.totals.failed > 0 ? "error" : "default"}>
                failed {state.totals.failed}
              </Badge>
              <Button
                className="ml-auto"
                size="sm"
                variant="ghost"
                onClick={clearBatches}
              >
                Clear
              </Button>
            </header>

            <TabsRoot defaultSelectedId="batches">
              <TabList>
                <Tab id="batches">Batches</Tab>
                <Tab id="identity">Identity</Tab>
                <Tab id="flags">SDK settings</Tab>
              </TabList>
              <TabPanel tabId="batches">
                <BatchList />
              </TabPanel>
              <TabPanel tabId="identity">
                <IdentityPanel />
              </TabPanel>
              <TabPanel tabId="flags">
                <FlagPanel />
              </TabPanel>
            </TabsRoot>
          </div>
        </DrawerPanel>
      </DrawerRoot>
    </>
  );
}

function BatchList() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (state.batches.length === 0) {
    return (
      <p className="py-8 text-sm text-text-secondary">
        No batches yet. The SDK flushes its queue once per second.
      </p>
    );
  }

  return (
    <ol
      className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto"
      data-testid="devtools-batches"
    >
      {state.batches.map((batch) => (
        <li key={batch.id} className="rounded border border-border p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={batch.ok ? "success" : "error"}>
              {batch.status ?? "network failure"}
            </Badge>
            <span className="font-mono">{batch.url}</span>
            <span className="text-text-secondary">{batch.durationMs}ms</span>
            <span className="ml-auto text-text-secondary">
              {new Date(batch.at).toLocaleTimeString("en-US")}
            </span>
          </div>

          {/* The session credential ingest hands back. It appears on the response
              of the first batch and travels on `reopt-session-id` from the second. */}
          <div className="mt-2 flex flex-wrap gap-3 text-text-secondary">
            <span>events {batch.events.length}</span>
            {batch.headers["reopt-session-id"] ? (
              <span className="font-mono">
                session → {batch.headers["reopt-session-id"].slice(0, 18)}…
              </span>
            ) : (
              <span>no session header (first batch)</span>
            )}
          </div>

          <ul className="mt-2 flex flex-wrap gap-1">
            {batch.events.map((event, index) => (
              <li
                key={index}
                className="rounded bg-surface-inset px-2 py-0.5 font-mono"
              >
                {eventLabel(event)}
              </li>
            ))}
          </ul>

          <details className="mt-2">
            <summary className="cursor-pointer">payload</summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-surface-inset p-2">
              {JSON.stringify(
                {
                  headers: batch.headers,
                  events: batch.events,
                  response: batch.response,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </li>
      ))}
    </ol>
  );
}

function IdentityPanel() {
  const client = useReoptClient();
  // Serialised so the snapshot stays `Object.is`-stable between polls.
  const cookies = useClientSnapshot(readReoptCookies, "", 1000);

  return (
    <dl
      className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 py-4 text-xs"
      data-testid="devtools-identity"
    >
      <dt className="text-text-secondary">device id</dt>
      <dd className="font-mono break-all">{client?.getDeviceId() ?? "none"}</dd>
      <dt className="text-text-secondary">profile id</dt>
      <dd className="font-mono break-all">
        {String(client?.getProfileId() ?? "anonymous")}
      </dd>
      <dt className="text-text-secondary">storage</dt>
      <dd className="font-mono">{client?.identityStorage ?? "-"}</dd>
      <dt className="text-text-secondary">queued</dt>
      <dd className="font-mono">{client?.pending ?? 0}</dd>
      <dt className="text-text-secondary">consent (analytics)</dt>
      <dd className="font-mono">
        {String(client?.getConsent("analytics") ?? false)}
      </dd>
      <dt className="text-text-secondary">cookies</dt>
      <dd className="flex flex-col gap-1 font-mono break-all">
        {cookies === ""
          ? "no reopt_ cookies"
          : cookies.split("\n").map((line) => <span key={line}>{line}</span>)}
      </dd>
    </dl>
  );
}

/** The SDK's own cookies, one per line. Everything else on the page is ours. */
function readReoptCookies(): string {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith("reopt_"))
    .map((entry) => decodeURIComponent(entry).slice(0, 90))
    .join("\n");
}

/**
 * The flags live in a cookie and are read on the server, so changing one needs
 * a full reload: `init()` is idempotent per write key, and almost every option
 * here is read once, when the client is created. A `router.refresh()` would
 * re-render the tree against the client that already exists.
 */
function FlagPanel() {
  const [flags, setFlags] = useState(() =>
    parseFlags(readCookie(FLAGS_COOKIE)),
  );

  const toggle = (name: FlagName) => {
    const next = { ...flags, [name]: !flags[name] };
    setFlags(next);
    writeFlagsCookie(next);
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-3 py-4" data-testid="devtools-flags">
      {FLAG_NAMES.map((name) => (
        <label
          key={name}
          className="flex cursor-pointer items-start gap-3 text-sm"
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={flags[name]}
            onChange={() => toggle(name)}
            aria-label={FLAGS[name].label}
            data-testid={`flag-${name}`}
          />
          <span>
            <span className="font-medium">{FLAGS[name].label}</span>
            <span className="block text-xs text-text-secondary">
              {FLAGS[name].detail}
            </span>
          </span>
        </label>
      ))}
      <Separator />
      <p className="text-xs text-text-secondary">
        Changing a switch reloads the page because most options are read once
        when the client is created.
      </p>
    </div>
  );
}

function writeFlagsCookie(flags: Flags): void {
  document.cookie = `${FLAGS_COOKIE}=${serializeFlags(flags)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .find((entry) => entry.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}
