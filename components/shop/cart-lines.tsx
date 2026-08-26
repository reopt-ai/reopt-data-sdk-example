"use client";

import { useTrack } from "@reopt-ai/data-sdk-client/next";
import { Button } from "@reopt-ai/opt-ui";
import { useTransition } from "react";

import { setQuantityAction } from "@/app/actions";
import { formatWon } from "@/lib/shop/catalog";

export interface CartLineView {
  productId: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export function CartLines({ lines }: { lines: CartLineView[] }) {
  const track = useTrack();
  const [pending, startTransition] = useTransition();

  const change = (line: CartLineView, quantity: number) => {
    track(quantity === 0 ? "cart.removed" : "cart.updated", {
      product_id: line.productId,
      product_slug: line.slug,
      category: line.category,
      quantity,
      previous_quantity: line.quantity,
    });
    startTransition(() => setQuantityAction(line.productId, quantity));
  };

  return (
    <ul className="flex flex-col gap-3" data-testid="cart-lines">
      {lines.map((line) => (
        <li
          key={line.productId}
          className="flex items-center gap-4 rounded border border-border p-4"
        >
          <span className="flex-1 font-medium">{line.name}</span>
          <span className="text-sm text-text-secondary">
            {formatWon(line.price)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => change(line, line.quantity - 1)}
            >
              −
            </Button>
            <span className="w-8 text-center" data-testid={`qty-${line.slug}`}>
              {line.quantity}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => change(line, line.quantity + 1)}
            >
              +
            </Button>
          </div>
          <span className="w-28 text-right">{formatWon(line.subtotal)}</span>
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => change(line, 0)}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
