"use client";

import { useReopt, useTrack } from "@reopt-ai/data-sdk-client/next";
import {
  Button,
  Card,
  CardContent,
  Input,
  Radio,
  RadioGroup,
  toast,
} from "@reopt-ai/opt-ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useClientSnapshot } from "@/lib/use-client-snapshot";

import { placeOrderAction } from "@/app/actions";

/**
 * Checkout, in the two shapes a real app has to choose between.
 *
 * **Server action** — `getReopt()` reads the device from the request's own
 * cookies. Nothing is passed from the page, so nothing can be forged there.
 *
 * **Route handler with an explicit device id** — the page reads
 * `getDeviceId()` and sends it in the body; the handler puts it on the event as
 * `identity.deviceId`. This is the shape a form post, a webhook or a batch
 * forwarder needs, where the request that carries the conversion is not the
 * visitor's browser. Row-level `deviceId` wins over the batch header, so one
 * batch can carry several visitors.
 */
export function CheckoutForm({ defaultEmail }: { defaultEmail: string }) {
  const { getDeviceId } = useReopt();
  const track = useTrack();
  const router = useRouter();
  const [mode, setMode] = useState("server-action");
  const [pending, startTransition] = useTransition();

  // Available only after hydration: on the server there is no client, and
  // `getDeviceId()` returns null while analytics is disabled — a state to show,
  // not to work around.
  const deviceId = useClientSnapshot(getDeviceId, null);

  return (
    <Card>
      <CardContent className="py-6 sm:p-8">
        <h2 className="text-xl font-semibold">Contact and confirmation</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          The confirmation path changes how the same trusted conversion reaches
          the server.
        </p>
        <form
          className="mt-6 flex flex-col gap-5"
          action={(formData) => {
            track("checkout.submitted", { mode });
            if (mode === "server-action") {
              startTransition(() => placeOrderAction(formData));
              return;
            }
            startTransition(async () => {
              const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  email: String(formData.get("email") ?? ""),
                  // The one value the handler cannot read for itself.
                  deviceId,
                }),
              });
              const result = (await response.json()) as {
                orderId?: string;
                error?: string;
              };
              if (!response.ok || !result.orderId) {
                toast.error(
                  result.error === "identity_mismatch"
                    ? "The device identity changed. Reload and try again."
                    : "The order could not be placed.",
                );
                return;
              }
              router.push(`/checkout/success?order=${result.orderId}`);
            });
          }}
        >
          <Input
            name="email"
            type="email"
            label="Email"
            required
            defaultValue={defaultEmail}
            data-testid="email"
          />

          <RadioGroup
            label="SDK confirmation path"
            value={mode}
            onChange={setMode}
          >
            <Radio
              value="server-action"
              label="Server Action — use the verified request cookie"
            />
            <Radio
              value="route-handler"
              label="Route Handler — verify an explicit device ID handoff"
            />
          </RadioGroup>

          <p className="rounded-[var(--opt-radius-sm)] bg-bg-subtle p-3 text-xs leading-5 text-text-secondary">
            Analytics identity for this page:{" "}
            <code data-testid="checkout-device-id">
              {deviceId ?? "none (analytics disabled)"}
            </code>
          </p>

          <Button type="submit" loading={pending} data-testid="place-order">
            Confirm demo order
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
