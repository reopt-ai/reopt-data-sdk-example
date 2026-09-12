"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useReopt } from "@reopt-ai/data-sdk-client/next";
import { Button, Card, CardContent, Input } from "@reopt-ai/opt-ui";
import { FLAGS_COOKIE, serializeFlags, type Flags } from "@/lib/reopt/flags";

const subscribeHydration = () => () => {};

export function ReplayLab({ flags }: { flags: Flags }) {
  const inputId = useId();
  const { client } = useReopt();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  // Keep npm mode buildable until the next client release. Capability detection
  // is confined to this lab; the storefront uses the published SDK unchanged.
  const replayClient = client as typeof client & {
    flushReplay?: () => Promise<void>;
    setConsent: (category: "replay", allowed: boolean) => void;
  };
  const supported = hydrated && typeof replayClient?.flushReplay === "function";
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState(
    "No recording consent granted in this lab.",
  );
  const [runId, setRunId] = useState("");
  const [count, setCount] = useState(0);
  const generatedStyle = useRef<HTMLStyleElement>(null);
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <p className="text-sm text-text-secondary">
          Input values and visible text are masked. The marked private panel is
          blocked. Network bodies, console output, canvas and cross-origin
          frames are excluded. Enable replay for this project in reopt-data
          first.
        </p>
        {!flags.sessionReplay && (
          <Button
            onClick={() => {
              document.cookie = `${FLAGS_COOKIE}=${serializeFlags({ ...flags, sessionReplay: true })}; Path=/; SameSite=Lax`;
              location.reload();
            }}
          >
            Enable replay SDK and reload
          </Button>
        )}
        {flags.sessionReplay && !supported && (
          <output>
            The installed npm release does not include replay yet. Use the
            repository's local SDK development loop.
          </output>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="replay-consent"
            disabled={!flags.sessionReplay || !supported || consented}
            onClick={async () => {
              if (!client) return;
              const id = crypto.randomUUID();
              setRunId(id);
              client.setConsent("analytics", true);
              client.track({
                name: "replay.lab.started",
                properties: { replay_run_id: id },
              });
              await client.flush();
              replayClient?.setConsent("replay", true);
              setConsented(true);
              setStatus(
                "Consent granted. Recording waits for the project's sampling decision and an active analytics session.",
              );
            }}
          >
            Agree to record this synthetic visit
          </Button>
          <Button
            data-testid="replay-stop"
            variant="secondary"
            disabled={!supported}
            onClick={() => {
              replayClient?.setConsent("replay", false);
              setConsented(false);
              setStatus(
                "Consent withdrawn. Capture stopped and unsent replay data discarded.",
              );
            }}
          >
            Withdraw replay consent
          </Button>
          <Button
            data-testid="replay-flush"
            variant="secondary"
            disabled={!supported}
            onClick={async () => {
              await client?.flush();
              await replayClient?.flushReplay?.();
              setStatus(
                "Flush attempted. Check the replay requests for acceptance; retries and sampling still apply.",
              );
            }}
          >
            Flush replay
          </Button>
        </div>
        <output data-testid="replay-status" className="text-sm">
          {status}
        </output>
        {runId && (
          <p className="text-xs break-all" data-testid="replay-run-id">
            Run: {runId}
          </p>
        )}
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h2 className="font-medium">Synthetic interaction area</h2>
          <style>
            {
              "@font-face{font-family:ReplayPublicMono;src:url('/fonts/replay/JetBrainsMono-Regular.woff2') format('woff2');font-display:swap}.replay-public-font{font-family:ReplayPublicMono,monospace}"
            }
          </style>
          <p className="replay-public-font text-sm">
            Public font checkpoint: 0123456789
          </p>
          {/* A plain img deliberately exercises the original static URL, without an image optimizer URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- the replay lab tests native image serialization */}
          <img
            className="replay-public-image rounded-lg"
            src="/images/products/halo-desk-lamp.webp"
            width={180}
            height={180}
            alt="Synthetic public desk lamp"
          />
          <p className="text-xs text-text-secondary">
            This public product image and font are explicitly included in
            recordings. Other images and fonts remain excluded.
          </p>
          <label htmlFor={inputId} className="flex flex-col gap-2 text-sm">
            Masked input
            <Input
              id={inputId}
              aria-label="Replay masked input"
              placeholder="Use synthetic text only"
            />
          </label>
          <Button
            data-testid="replay-mutate"
            variant="secondary"
            onClick={() => {
              setCount(count + 1);
              if (consented)
                client?.track({
                  name: "replay.lab.layout_changed",
                  properties: { replay_run_id: runId, layout_step: count + 1 },
                });
              const rule = generatedStyle.current?.sheet?.cssRules[0];
              if (rule instanceof CSSStyleRule)
                rule.style.setProperty(
                  "content",
                  '"REPLAY_CSS_DYNAMIC_PRIVATE"',
                );
            }}
          >
            Change layout ({count})
          </Button>
          <Button
            data-testid="replay-error"
            variant="secondary"
            disabled={!consented}
            onClick={() => {
              client?.captureException(
                new Error("Synthetic replay checkpoint"),
                {
                  fingerprint: "replay-lab-checkpoint",
                  properties: { replay_run_id: runId },
                },
              );
              setStatus(
                "Synthetic error captured. Flush, then select the error in the Data replay timeline.",
              );
            }}
          >
            Capture synthetic error
          </Button>
          <style ref={generatedStyle}>
            {
              '.replay-generated-content::after{content:"REPLAY_CSS_PRIVATE" "REPLAY_CSS_SECOND_PRIVATE"}'
            }
          </style>
          <p className="replay-generated-content text-sm">
            Synthetic CSS text:{" "}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: (count % 6) + 1 }, (_, index) => (
              <div key={index} className="h-16 rounded bg-accent/20 p-2">
                Card {index + 1}
              </div>
            ))}
          </div>
          <div
            data-reopt-replay-block
            className="rounded border border-border p-4"
          >
            Synthetic private panel: REPLAY_PRIVATE_SENTINEL
          </div>
          <Link className="text-accent underline" href="/products">
            Continue the visit in the shop
          </Link>
        </section>
      </CardContent>
    </Card>
  );
}
