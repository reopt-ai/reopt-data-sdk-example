"use client";

import { useReopt, useTrack } from "@reopt-ai/data-sdk-client/next";
import { Badge, Button, Card, CardContent, toast } from "@reopt-ai/opt-ui";
import { useState } from "react";

import { REOPT_SCENARIOS } from "@/lib/reopt/scenarios";

/**
 * Buttons for the events that normally happen to you rather than because of
 * you: an uncaught error, a manual capture, a server error, a flush, consent
 * changes, and `reset()`.
 */
export function InstrumentationLab({
  exceptionsEnabled,
  serverDiagnosticsEnabled,
  demoRunId,
}: {
  exceptionsEnabled: boolean;
  serverDiagnosticsEnabled: boolean;
  demoRunId?: string;
}) {
  const {
    captureException,
    flush,
    pauseTracking,
    resumeTracking,
    setConsent,
    getConsent,
    reset,
    getDeviceId,
  } = useReopt();
  // `useReopt().track` takes one options object; `useTrack()` is the
  // (name, properties) form. Both exist; this is the one that reads better.
  const track = useTrack();
  const [paused, setPaused] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-medium">
            Exceptions
            <Badge variant={exceptionsEnabled ? "success" : "warning"}>
              capture.exceptions {exceptionsEnabled ? "on" : "off"}
            </Badge>
          </h2>
          <p className="text-sm text-text-secondary">
            Enable automatic capture in the SDK settings. When it is off, the
            first button throws without creating an analytics event.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              data-testid="throw-uncaught"
              onClick={() => {
                // Thrown from a timer so React's error boundary does not swallow
                // it: the SDK listens on `window.onerror`.
                setTimeout(() => {
                  throw new Error("Intentional client error (uncaught)");
                }, 0);
              }}
            >
              Throw uncaught error
            </Button>
            <Button
              variant="secondary"
              data-testid="capture-exception"
              onClick={() => {
                captureException(
                  new Error("Intentional manually captured error"),
                  {
                    where: "lab",
                  },
                );
                toast.info("Queued a $exception event");
              }}
            >
              Capture manually
            </Button>
            {serverDiagnosticsEnabled && (
              <Button
                variant="secondary"
                data-testid="server-error"
                onClick={async () => {
                  await fetch("/api/boom").catch(() => undefined);
                  toast.info(
                    "Server error requested; onRequestError will capture it",
                  );
                }}
              >
                Trigger server error
              </Button>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Queue and consent</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              data-testid="flush-now"
              onClick={async () => {
                const result = await flush();
                toast.info(
                  `flush: ${result.status} · sent ${result.sent} · pending ${result.pending}`,
                );
              }}
            >
              Flush now
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (paused) resumeTracking();
                else pauseTracking();
                setPaused(!paused);
              }}
            >
              {paused ? "Resume tracking" : "Pause tracking"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              data-testid="toggle-consent"
              onClick={() => {
                const next = !getConsent("analytics");
                setConsent("analytics", next);
                setAnalytics(next);
                toast.info(
                  next
                    ? "Analytics consent granted"
                    : "Analytics declined; tracking is now disabled",
                );
              }}
            >
              {analytics ? "Decline analytics" : "Allow analytics"}
            </Button>
            <Button
              size="sm"
              variant="danger"
              data-testid="reset-device"
              onClick={() => {
                reset();
                toast.info(
                  `New device: ${getDeviceId()?.slice(0, 12) ?? "none"}…`,
                );
              }}
            >
              Reset device
            </Button>
            <Button
              size="sm"
              data-testid="send-sample-event"
              onClick={() =>
                track(REOPT_SCENARIOS.roundtrip.eventName, {
                  at: Date.now(),
                  [REOPT_SCENARIOS.roundtrip.sourceProperty]:
                    REOPT_SCENARIOS.roundtrip.source,
                  ...(demoRunId
                    ? { [REOPT_SCENARIOS.roundtrip.runIdProperty]: demoRunId }
                    : {}),
                })
              }
            >
              Send sample event
            </Button>
          </div>
          <p className="text-sm text-text-secondary">
            Declining analytics makes the proxy <strong>delete</strong> the
            device cookie on the next request. Reload and inspect the Identity
            tab in SDK devtools.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
