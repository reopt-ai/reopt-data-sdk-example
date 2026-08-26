"use client";

import { useConsent } from "@reopt-ai/data-sdk-client/next";
import { Button, Card, CardContent } from "@reopt-ai/opt-ui";
import { useEffect, useState } from "react";

import { useClientSnapshot } from "@/lib/use-client-snapshot";

/**
 * A consent banner that owns the decision.
 *
 * With the `externalConsent` flag on, the SDK runs with
 * `consent.persist: false` — it keeps no cookie of its own that could disagree
 * with this banner. The banner is then the single source of truth and tells the
 * SDK about each decision through `setConsent()`.
 *
 * Because the SDK forgets across loads in that mode, the stored decision is
 * replayed into it on mount. That is what an effect is for — synchronising an
 * external system — and it stores nothing in React state of its own.
 *
 * The proxy deletes the device cookie when analytics is refused, so opting out
 * is "forget me", not merely "stop sending". Reload after refusing and the
 * cookie is gone.
 */
const DECISION_KEY = "shop_consent_decision";

export function ConsentBanner({ external }: { external: boolean }) {
  const { setConsent } = useConsent();
  const [dismissed, setDismissed] = useState(false);
  const stored = useClientSnapshot(readDecision, null);

  useEffect(() => {
    if (!external || stored === null) return;
    // A decision the SDK cannot remember for itself, handed back to it.
    setConsent("analytics", stored === "granted");
    setConsent("marketing", stored === "granted");
  }, [external, stored, setConsent]);

  const decide = async (granted: boolean) => {
    window.localStorage.setItem(DECISION_KEY, granted ? "granted" : "denied");
    setConsent("analytics", granted);
    setConsent("marketing", granted);
    // The server has to hear about it too. With `persist: false` the SDK writes
    // no consent cookie, and the proxy reads exactly that cookie to decide
    // whether to delete the device one. Skip this and refusing means "stop
    // sending" while the server keeps identifying the visitor.
    // Awaited, not fire-and-forget: the response carries the `Set-Cookie` the
    // proxy reads on the next request. Navigating before it lands would leave
    // the visitor identified after they refused.
    await fetch("/api/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ granted }),
    }).catch(() => undefined);
    setDismissed(true);
  };

  if (!external || dismissed || stored !== null) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 p-4"
      data-testid="consent-banner"
    >
      <Card className="mx-auto max-w-3xl shadow-[var(--opt-shadow-lg)]">
        <CardContent className="flex flex-wrap items-center gap-4 py-5 sm:px-6">
          <div className="min-w-60 flex-1">
            <h2 className="font-semibold">
              Choose your demo analytics setting
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Allow anonymous analytics to populate the SDK examples, or decline
              to verify the complete opt-out path.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => void decide(false)}
            data-testid="consent-deny"
          >
            Decline
          </Button>
          <Button onClick={() => void decide(true)} data-testid="consent-allow">
            Allow analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function readDecision(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DECISION_KEY);
  } catch {
    // Private mode, blocked storage: treat it as undecided rather than crashing
    // the page over a banner.
    return null;
  }
}
