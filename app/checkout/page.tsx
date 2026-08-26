import { Card, CardContent, PageHeader } from "@reopt-ai/opt-ui";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Checkout"
        description="The server confirms each order. Exercise the same conversion through a Server Action or a Route Handler."
      />

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <CheckoutForm defaultEmail={session?.email ?? ""} />

        <Card>
          <CardContent className="flex flex-col gap-2 py-5 text-sm">
            <h2 className="font-medium">Order summary</h2>
            {lines.map((line) => (
              <div key={line.productId} className="flex justify-between">
                <span className="text-text-secondary">
                  {line.product.name} × {line.quantity}
                </span>
                <span>{formatWon(line.subtotal)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between font-medium">
              <span>Total</span>
              <span data-testid="checkout-total">{formatWon(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
