import { Card, CardContent, EmptyState } from "@reopt-ai/opt-ui";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { formatWon } from "@/lib/shop/catalog";
import { readCartId } from "@/lib/shop/cart-session";
import { findOrderForCart } from "@/lib/shop/store";

export const metadata = { title: "Order confirmed" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const cartId = await readCartId();
  const order = orderId ? findOrderForCart(orderId, cartId) : undefined;

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description="The order does not belong to this browser or is no longer available."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="text-center">
        <CheckCircle2
          className="mx-auto size-12 text-success"
          aria-hidden="true"
        />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">
          Order confirmed
        </h1>
        <p className="mt-3 text-text-secondary">
          Your demo order{" "}
          <span className="text-text font-mono">{order.id}</span> crossed the
          trusted server boundary.
        </p>
      </header>
      <Card>
        <CardContent
          className="flex flex-col gap-2 py-5 text-sm"
          data-testid="order-summary"
        >
          <Row label="Total" value={formatWon(order.total)} />
          <Row label="Confirmation path" value={order.source} />
          <Row label="Verified event device" value={order.deviceId ?? "none"} />
          <Row label="Profile" value={order.profileId ?? "anonymous"} />
          <p className="mt-4 rounded-[var(--opt-radius-sm)] bg-bg-subtle p-4 leading-6 text-text-secondary">
            The same order was recorded in the outbox. Running{" "}
            <code>pnpm forward</code> carries its verified <code>deviceId</code>
            with the delayed event.
          </p>
          <Link
            href="/orders"
            className="store-button focus-ring mt-3 self-start"
          >
            View orders
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono break-all">{value}</span>
    </div>
  );
}
