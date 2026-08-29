"use client";

import { useReopt } from "@reopt-ai/data-sdk-client/next";
import { Badge, Button, Card, CardContent, toast } from "@reopt-ai/opt-ui";

/**
 * One button per exception shape, plus the breadcrumbs that lead to it.
 *
 * Every click records a step before it does anything else, so whichever button
 * finally throws carries the trail of the ones pressed before it. That is the
 * point of breadcrumbs — the interesting ones are the clicks that happened
 * *before* the failure, and a demo that only recorded the failing click would
 * show a trail of length one.
 */
export function ErrorLab({
  exceptionsEnabled,
}: {
  exceptionsEnabled: boolean;
}) {
  const { captureException, addExceptionStep } = useReopt();

  const step = (message: string) =>
    addExceptionStep({ category: "click", message });

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-medium">
            Exception shapes
            <Badge variant={exceptionsEnabled ? "success" : "warning"}>
              capture.exceptions {exceptionsEnabled ? "on" : "off"}
            </Badge>
          </h2>
          <p className="text-sm text-text-secondary">
            The first, second, fourth and fifth buttons need automatic capture
            turned on in the SDK settings — they throw rather than report.
            &ldquo;Capture handled&rdquo; always reports, because it calls the
            SDK itself.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              data-testid="throw-type-error"
              onClick={() => {
                step("Throw TypeError");
                // Thrown from a timer, not from the handler: React's error
                // boundary would swallow it, and the SDK listens on
                // `window.onerror`.
                setTimeout(() => {
                  const order = undefined as unknown as { total: number };
                  // eslint-disable-next-line no-unused-expressions
                  order.total;
                }, 0);
              }}
            >
              Throw TypeError
            </Button>

            <Button
              variant="danger"
              data-testid="reject-promise"
              onClick={() => {
                step("Reject a promise");
                // No `.catch()` on purpose: this is the `unhandledrejection`
                // path, which is a different listener from `onerror`.
                void Promise.reject(
                  new Error("Checkout payment authorization failed"),
                );
              }}
            >
              Unhandled rejection
            </Button>

            <Button
              variant="secondary"
              data-testid="capture-handled"
              onClick={() => {
                step("Capture a handled error");
                captureException(
                  new Error("Coupon SUMMER24 is no longer valid"),
                  {
                    // `warning` is what a recoverable failure is: the visitor saw
                    // a message and could carry on.
                    level: "warning",
                    // A caller-supplied fingerprint is a *suggestion* the server
                    // bounds — here it groups every invalid coupon together
                    // instead of once per coupon code.
                    fingerprint: "checkout-invalid-coupon",
                    properties: { coupon: "SUMMER24", where: "checkout" },
                  },
                );
                toast.info("Queued a handled $exception");
              }}
            >
              Capture handled
            </Button>

            <Button
              variant="danger"
              data-testid="throw-string"
              onClick={() => {
                step("Throw a string");
                setTimeout(() => {
                  // Not an Error. The SDK has to synthesize one, and the issue
                  // detail should still show a type and a message rather than
                  // an empty chain.
                  // eslint-disable-next-line no-throw-literal
                  throw "Legacy code threw a string";
                }, 0);
              }}
            >
              Throw a string
            </Button>

            <Button
              variant="danger"
              data-testid="throw-cause-chain"
              onClick={() => {
                step("Throw with a cause chain");
                setTimeout(() => {
                  const root = new TypeError(
                    "Cannot read properties of null (reading 'id')",
                  );
                  const middle = new Error("Failed to load the cart", {
                    cause: root,
                  });
                  throw new Error("Checkout could not start", {
                    cause: middle,
                  });
                }, 0);
              }}
            >
              Throw a cause chain
            </Button>

            <Button
              variant="secondary"
              data-testid="server-500"
              onClick={async () => {
                step("Request a failing route");
                await fetch("/api/debug/error").catch(() => undefined);
                toast.info(
                  "Server error requested; onRequestError will capture it",
                );
              }}
            >
              Trigger server 500
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Breadcrumbs</h2>
          <p className="text-sm text-text-secondary">
            Every button above records a step first, so the exception that lands
            carries the clicks that preceded it. Turn{" "}
            <code>capture.exceptionSteps</code> on in the SDK settings to send
            them as <code>$exception_steps</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              data-testid="add-step"
              onClick={() => {
                step("Browsed the catalogue");
                toast.info("Recorded a breadcrumb");
              }}
            >
              Record a breadcrumb
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
