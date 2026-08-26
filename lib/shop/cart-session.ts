import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { resolveCart } from "./store";

/**
 * The cart id, in a cookie of the shop's own.
 *
 * Kept separate from anything reopt: the analytics device id identifies a
 * browser for measurement and must not become the key to someone's basket.
 */
export const CART_COOKIE = "shop_cart";
const CART_ID =
  /^cart_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validCartId(value: string | undefined): string | null {
  return value && CART_ID.test(value) ? value : null;
}

export async function readCartId(): Promise<string | null> {
  return validCartId((await cookies()).get(CART_COOKIE)?.value);
}

/**
 * The cart id for this request, minting one if needed. Only callable where
 * Next allows a cookie write — a server action or a route handler.
 */
export async function ensureCartId(): Promise<string> {
  const store = await cookies();
  const existing = validCartId(store.get(CART_COOKIE)?.value);
  if (existing) return existing;

  const id = `cart_${randomUUID()}`;
  store.set(CART_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

export async function cartCount(): Promise<number> {
  const id = await readCartId();
  return id ? resolveCart(id).count : 0;
}
