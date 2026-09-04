import { Card, CardContent } from "@reopt-ai/opt-ui";
import Image from "next/image";
import { redirect } from "next/navigation";

import { CheckoutViewEvent } from "@/components/reopt/checkout-view-event";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { currentSession } from "@/lib/auth";
import { formatWon } from "@/lib/shop/catalog";
import { readCartId } from "@/lib/shop/cart-session";
import { resolveCart } from "@/lib/shop/store";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cartId = await readCartId();
  const { lines, total } = cartId
    ? resolveCart(cartId)
    : { lines: [], total: 0 };
  if (lines.length === 0) redirect("/cart");

  const session = await currentSession();
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const categories = [...new Set(lines.map((line) => line.product.category))];

  return (
    <div className="flex flex-col gap-8">
      <CheckoutViewEvent
        cartValue={total}
        itemCount={itemCount}
        categories={categories}
      />
      <header className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Checkout
        </h1>
        <p className="mt-3 leading-7 text-text-secondary">
          Complete a safe demo order. No payment details are requested and no
          purchase is made.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <CheckoutForm
          defaultEmail={session?.email ?? ""}
          cartValue={total}
          itemCount={itemCount}
          categories={categories}
        />

        <Card className="h-fit">
          <CardContent className="flex flex-col gap-4 py-6 text-sm">
            <h2 className="text-lg font-semibold">Order summary</h2>
            {lines.map((line) => (
              <div key={line.productId} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-[var(--opt-radius-sm)] bg-bg-subtle">
                  <Image
                    src={line.product.image}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <p className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {line.product.name}
                  </span>
                  <span className="text-text-secondary">
                    Quantity {line.quantity}
                  </span>
                </p>
                <span>{formatWon(line.subtotal)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-4 text-base font-semibold">
              <span>Total</span>
              <span data-testid="checkout-total">{formatWon(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
