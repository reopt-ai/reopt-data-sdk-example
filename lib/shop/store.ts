import "server-only";

import { randomUUID } from "node:crypto";

import { findProductById, type Product } from "./catalog";

/**
 * Carts, orders and the analytics outbox, kept in module scope.
 *
 * A demo store does not need durability, and a database between the click and
 * the event would only obscure what this repo is about. The one property that
 * matters is that a row survives long enough for `scripts/forward.ts` to read
 * it in a separate process — so the outbox is also mirrored to a file.
 */

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  lines: CartLine[];
}

export interface OrderLine extends CartLine {
  name: string;
  price: number;
}

export interface Order {
  id: string;
  cartId: string;
  createdAt: string;
  email: string;
  profileId: string | null;
  /** The device identity verified by the request-scoped server SDK. */
  deviceId: string | null;
  lines: OrderLine[];
  total: number;
  /** Which code path recorded it — the demo shows both. */
  source: "server-action" | "route-handler";
}

interface ShopStore {
  carts: Map<string, Cart>;
  orders: Order[];
}

const globalForShop = globalThis as unknown as {
  __reoptExampleShopStore?: ShopStore;
};

// Route Handlers, Server Actions, and Server Components may be compiled into
// separate module graphs. A process-wide store keeps the example coherent
// across those graphs; a real application should replace it with durable,
// authorization-aware persistence.
const shopStore = (globalForShop.__reoptExampleShopStore ??= {
  carts: new Map<string, Cart>(),
  orders: [],
});
const { carts, orders } = shopStore;

export function getCart(cartId: string): Cart {
  let cart = carts.get(cartId);
  if (!cart) {
    cart = { id: cartId, lines: [] };
    carts.set(cartId, cart);
  }
  return cart;
}

export function addLine(cartId: string, productId: string, quantity = 1): Cart {
  const cart = getCart(cartId);
  const existing = cart.lines.find((line) => line.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.lines.push({ productId, quantity });
  return cart;
}

export function setLineQuantity(
  cartId: string,
  productId: string,
  quantity: number,
): Cart {
  const cart = getCart(cartId);
  if (quantity <= 0) {
    cart.lines = cart.lines.filter((line) => line.productId !== productId);
    return cart;
  }
  const existing = cart.lines.find((line) => line.productId === productId);
  if (existing) existing.quantity = quantity;
  return cart;
}

export function clearCart(cartId: string): void {
  carts.delete(cartId);
}

export interface ResolvedCartLine extends CartLine {
  product: Product;
  subtotal: number;
}

export function resolveCart(cartId: string): {
  lines: ResolvedCartLine[];
  total: number;
  count: number;
} {
  const lines: ResolvedCartLine[] = [];
  for (const line of getCart(cartId).lines) {
    const product = findProductById(line.productId);
    if (!product) continue;
    lines.push({ ...line, product, subtotal: product.price * line.quantity });
  }
  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.subtotal, 0),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export function createOrder(input: Omit<Order, "id" | "createdAt">): Order {
  const order: Order = {
    ...input,
    id: `ord_${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);
  return order;
}

/** Orders owned by the opaque cart capability in the current request. */
export function listOrdersForCart(cartId: string | null): Order[] {
  if (!cartId) return [];
  return orders.filter((order) => order.cartId === cartId);
}

/** Prevents an order id from becoming an insecure direct object reference. */
export function findOrderForCart(
  id: string,
  cartId: string | null,
): Order | undefined {
  if (!cartId) return undefined;
  return orders.find((order) => order.id === id && order.cartId === cartId);
}
