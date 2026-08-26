import { NextResponse } from "next/server";

import { currentSession } from "@/lib/auth";
import { getReopt } from "@/lib/reopt/server";
import { readCartId } from "@/lib/shop/cart-session";
import { findProductById } from "@/lib/shop/catalog";
import { CheckoutInput } from "@/lib/shop/input";
import { appendOutbox } from "@/lib/shop/outbox";
import { clearCart, createOrder, resolveCart } from "@/lib/shop/store";

/**
 * Checkout through a route handler, with the device id passed in explicitly.
 *
 * The page read it with `getDeviceId()` and put it in the body. The handler
 * files the event under that device with `identity.deviceId`, which is what
 * lets a conversion confirmed anywhere — a form post, a webhook, a batch
 * forwarder — land in the visitor's live session.
 *
 * A browser controls the request body, so its `deviceId` is not trusted merely
 * because this handler later uses server credentials. The handler compares it
 * with the request-scoped SDK identity first and rejects a mismatch. A webhook
 * or worker should apply the equivalent check at the point where it records the
 * identity for later delivery.
 */
export async function POST(request: Request) {
  const parsed = CheckoutInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const cartId = await readCartId();
  const { lines, total } = cartId
    ? resolveCart(cartId)
    : { lines: [], total: 0 };
  if (!cartId || lines.length === 0) {
    return NextResponse.json({ error: "cart_empty" }, { status: 400 });
  }

  const session = await currentSession();
  const reopt = await getReopt();
  const requestedDeviceId = parsed.data.deviceId;
  const verifiedDeviceId = reopt.deviceId ?? null;
  if (requestedDeviceId !== verifiedDeviceId) {
    return NextResponse.json({ error: "identity_mismatch" }, { status: 400 });
  }
  const deviceId = verifiedDeviceId;

  const order = createOrder({
    cartId,
    email: parsed.data.email,
    profileId: session?.userId ?? null,
    deviceId,
    lines: lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      name: line.product.name,
      price: line.product.price,
    })),
    total,
    source: "route-handler",
  });

  reopt.track({
    name: "order.completed",
    properties: {
      order_id: order.id,
      total,
      item_count: order.lines.reduce((sum, line) => sum + line.quantity, 0),
      categories: [
        ...new Set(
          order.lines.map((line) => findProductById(line.productId)?.category),
        ),
      ].filter(Boolean),
      source: "route-handler",
    },
    ...(deviceId ? { identity: { deviceId } } : {}),
  });

  appendOutbox({
    name: "order.reconciled",
    deviceId,
    profileId: session?.userId ?? null,
    properties: { order_id: order.id, total, source: "outbox" },
  });

  clearCart(cartId);
  return NextResponse.json({ orderId: order.id });
}
