import { Card, CardContent, EmptyState, PageHeader } from "@reopt-ai/opt-ui";

import { OrdersGrid } from "@/components/shop/orders-grid";
import { readCartId } from "@/lib/shop/cart-session";
import { listOutboxForOrders } from "@/lib/shop/outbox";
import { listOrdersForCart } from "@/lib/shop/store";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const orders = listOrdersForCart(await readCartId());
  const outbox = listOutboxForOrders(orders.map((order) => order.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Only this browser's orders are shown, including their confirmation path and verified analytics identity."
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Add a product to the cart and complete checkout."
        />
      ) : (
        <OrdersGrid
          rows={orders.map((order) => ({
            id: order.id,
            createdAt: new Date(order.createdAt).toLocaleString("en-US"),
            email: order.email,
            total: order.total,
            items: order.lines.reduce((sum, line) => sum + line.quantity, 0),
            source: order.source,
            deviceId: order.deviceId ?? "-",
            profileId: order.profileId ?? "anonymous",
          }))}
        />
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 py-5 text-sm">
          <h2 className="font-medium">Outbox ({outbox.length})</h2>
          <p className="text-text-secondary">
            These rows record who a delayed conversion belongs to. Running{" "}
            <code>pnpm forward</code> sends them with{" "}
            <code>createReoptNode</code>. A batch may contain several device
            IDs; ingest associates each row with the correct session.
          </p>
          {outbox.length > 0 && (
            <ul
              className="flex flex-col gap-1 font-mono text-xs"
              data-testid="outbox-rows"
            >
              {outbox.slice(-8).map((row) => (
                <li key={row.id}>
                  {row.forwardedAt ? "✓" : "·"} {row.name} · device{" "}
                  {(row.deviceId ?? "none").slice(0, 12)} ·{" "}
                  {row.forwardedAt
                    ? `sent ${new Date(row.forwardedAt).toLocaleTimeString("en-US")}`
                    : "pending"}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
