import { Card, CardContent, EmptyState, PageHeader } from "@reopt-ai/opt-ui";
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
    <div className="flex flex-col gap-6">
      <PageHeader title="Order confirmed" description={`Order ${order.id}`} />
      <Card>
        <CardContent
          className="flex flex-col gap-2 py-5 text-sm"
          data-testid="order-summary"
        >
          <Row label="Total" value={formatWon(order.total)} />
          <Row label="Confirmation path" value={order.source} />
          <Row label="Verified event device" value={order.deviceId ?? "none"} />
          <Row label="Profile" value={order.profileId ?? "anonymous"} />
          <p className="mt-2 text-text-secondary">
            The same order was recorded in the outbox. Running{" "}
            <code>pnpm forward</code> carries its verified <code>deviceId</code>
            with the delayed event.
          </p>
          <Link href="/orders" className="text-accent">
            View orders →
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
