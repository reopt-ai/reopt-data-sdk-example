import { EmptyState } from "@reopt-ai/opt-ui";
import Link from "next/link";

import { CartLines } from "@/components/shop/cart-lines";
import { formatWon } from "@/lib/shop/catalog";
import { readCartId } from "@/lib/shop/cart-session";
import { resolveCart } from "@/lib/shop/store";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const cartId = await readCartId();
  const { lines, total } = cartId
    ? resolveCart(cartId)
    : { lines: [], total: 0 };

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          title="Your cart is empty"
          description="Choose a desk essential to begin the measured shopping journey."
        />
        <Link href="/products">
          <span className="store-button store-button-secondary">
            Browse products
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your cart
        </h1>
        <p className="mt-3 text-text-secondary">
          Review the collection before the server-confirmed checkout boundary.
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <CartLines
          lines={lines.map((line) => ({
            productId: line.productId,
            name: line.product.name,
            slug: line.product.slug,
            category: line.product.category,
            price: line.product.price,
            quantity: line.quantity,
            subtotal: line.subtotal,
            image: line.product.image,
            imageAlt: line.product.imageAlt,
          }))}
        />
        <aside className="h-fit rounded-[var(--opt-radius-lg)] border border-border bg-surface-raised p-6 shadow-[var(--opt-shadow-sm)]">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-5 flex justify-between border-b border-border-subtle pb-4 text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span data-testid="cart-total">{formatWon(total)}</span>
          </div>
          <div className="flex justify-between py-4 text-sm">
            <span className="text-text-secondary">Demo delivery</span>
            <span>Included</span>
          </div>
          <div className="flex justify-between border-t border-border pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>{formatWon(total)}</span>
          </div>
          <Link
            href="/checkout"
            className="store-button focus-ring mt-6 w-full"
            data-testid="to-checkout"
          >
            Continue to checkout
          </Link>
          <p className="mt-4 text-xs leading-5 text-text-tertiary">
            No real payment is collected. This checkout exists to demonstrate
            trusted conversion tracking.
          </p>
        </aside>
      </div>
    </div>
  );
}
