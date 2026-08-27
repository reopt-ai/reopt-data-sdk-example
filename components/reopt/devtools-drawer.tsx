"use client";

import { ReoptDevtools } from "@reopt-ai/data-sdk-devtool/react";
import { Separator } from "@reopt-ai/opt-ui";
import { useState, type ComponentProps, type ComponentType } from "react";

import { devtools } from "@/lib/reopt/devtools";
import {
  FLAGS,
  FLAG_NAMES,
  FLAGS_COOKIE,
  parseFlags,
  serializeFlags,
  type FlagName,
  type Flags,
} from "@/lib/reopt/flags";

type StatusBarDevtoolsProps = ComponentProps<typeof ReoptDevtools> & {
  layout?: "status-bar" | "button";
  console?: { origin: string; projectId: string } | undefined;
};

const StatusBarDevtools =
  ReoptDevtools as ComponentType<StatusBarDevtoolsProps>;

/**
 * The SDK devtools panel — what was sent, who the browser thinks it is, and
 * (this app's own tab) which options are on.
 *
 * Batches and identity come from `@reopt-ai/data-sdk-devtool`; the switches
 * are specific to this example, so they are added as an extra panel. This is
 * the piece that makes the app a testbed rather than a demo: an SDK change is
 * visible here within one interaction, without a dashboard round trip.
 */
export function DevtoolsDrawer({
  consoleOrigin,
  projectId,
}: {
  consoleOrigin: string;
  projectId: string | null;
}) {
  return (
    <StatusBarDevtools
      devtools={devtools}
      layout="status-bar"
      console={projectId ? { origin: consoleOrigin, projectId } : undefined}
      panels={[
        { id: "flags", label: "SDK settings", render: () => <FlagPanel /> },
      ]}
    />
  );
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
    <div className="flex flex-col gap-3 py-2" data-testid="devtools-flags">
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
            <span className="block text-xs opacity-70">
              {FLAGS[name].detail}
            </span>
          </span>
        </label>
      ))}
      <Separator />
      <p className="text-xs opacity-70">
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
