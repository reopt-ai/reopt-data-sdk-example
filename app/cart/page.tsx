import { Button, EmptyState, PageHeader, Separator } from "@reopt-ai/opt-ui";
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
          description="Add a product to see a cart.added event in SDK devtools."
        />
        <Link href="/products">
          <Button variant="secondary">Browse products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cart"
        description="Quantity changes send cart.updated; removals send cart.removed."
      />
      <CartLines
        lines={lines.map((line) => ({
          productId: line.productId,
          name: line.product.name,
          slug: line.product.slug,
          category: line.product.category,
          price: line.product.price,
          quantity: line.quantity,
          subtotal: line.subtotal,
        }))}
      />
      <Separator />
      <div className="flex items-center justify-end gap-6">
        <span className="text-text-secondary">Total</span>
        <span className="text-xl font-semibold" data-testid="cart-total">
          {formatWon(total)}
        </span>
        <Link href="/checkout">
          <Button data-testid="to-checkout">Checkout</Button>
        </Link>
      </div>
    </div>
  );
}
