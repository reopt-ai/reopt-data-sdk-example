"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentSession } from "@/lib/auth";
import { getReopt } from "@/lib/reopt/server";
import {
  ANALYTICS_CURRENCY,
  orderValueBand,
} from "@/lib/reopt/commerce-analytics";
import { findProductById } from "@/lib/shop/catalog";
import { ensureCartId, readCartId } from "@/lib/shop/cart-session";
import { CartMutationInput, checkoutFromFormData } from "@/lib/shop/input";
import { appendOutbox } from "@/lib/shop/outbox";
import {
  addLine,
  clearCart,
  createOrder,
  resolveCart,
  setLineQuantity,
} from "@/lib/shop/store";

/**
 * Cart mutations and checkout.
 *
 * The cart itself is not an analytics concern — `cart.added` is sent from the
 * button that was clicked, where the interaction actually happened. What the
 * server owns is the event nobody can fake: an order that really was placed.
 */

export async function addToCartAction(
  productId: string,
  quantity = 1,
): Promise<void> {
  const input = CartMutationInput.parse({ productId, quantity });
  if (!findProductById(input.productId)) throw new Error("Unknown product");
  const cartId = await ensureCartId();
  addLine(cartId, input.productId, input.quantity);
  revalidatePath("/cart");
  revalidatePath("/products");
}

export async function setQuantityAction(
  productId: string,
  quantity: number,
): Promise<void> {
  const input = CartMutationInput.parse({ productId, quantity });
  const cartId = await ensureCartId();
  setLineQuantity(cartId, input.productId, input.quantity);
  revalidatePath("/cart");
}

/**
 * Checkout through a server action.
 *
 * `getReopt()` reads the visitor's device from the request cookies, so
 * `order.completed` lands in the session the browser is already in — no id is
 * passed from the page and none could be forged there.
 *
 * The event is fire-and-forget: `track()` queues, and the SDK's `waitUntil`
 * detection keeps delivery alive past the response. A checkout must not wait
 * on analytics, and must not fail because of it.
 */
export async function placeOrderAction(formData: FormData): Promise<void> {
  const cartId = await readCartId();
  if (!cartId) redirect("/cart");

  const { lines, total } = resolveCart(cartId);
  if (lines.length === 0) redirect("/cart");

  const { email } = checkoutFromFormData(formData);
  const session = await currentSession();
  const reopt = await getReopt();
  // The browser must not choose identity for a server-authenticated event. The
  // request-scoped SDK has already verified the device cookie, so this is the
  // value persisted for delayed outbox delivery as well.
  const deviceId = reopt.deviceId ?? null;

  const order = createOrder({
    cartId,
    email,
    profileId: session?.userId ?? null,
    deviceId,
    lines: lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      name: line.product.name,
      price: line.product.price,
    })),
    total,
    source: "server-action",
  });

  reopt.track("order.completed", {
    order_id: order.id,
    total,
    item_count: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    categories: [
      ...new Set(
        order.lines.map((line) => findProductById(line.productId)?.category),
      ),
    ].filter(Boolean),
    source: "server-action",
    currency: ANALYTICS_CURRENCY,
    value_band: orderValueBand(total),
    funnel_stage: "converted",
  });

  // The same conversion, written down for the "record now, send later" demo.
  appendOutbox({
    name: "order.reconciled",
    deviceId,
    profileId: session?.userId ?? null,
    properties: {
      order_id: order.id,
      total,
      source: "outbox",
      currency: ANALYTICS_CURRENCY,
      value_band: orderValueBand(total),
    },
  });

  clearCart(cartId);
  revalidatePath("/cart");
  redirect(`/checkout/success?order=${order.id}`);
}
