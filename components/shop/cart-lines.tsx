"use client";

import { useTrack } from "@reopt-ai/data-sdk-client/next";
import { Button } from "@reopt-ai/opt-ui";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";

import { setQuantityAction } from "@/app/actions";
import { ANALYTICS_CURRENCY, priceBand } from "@/lib/reopt/commerce-analytics";
import { formatWon } from "@/lib/shop/catalog";

export interface CartLineView {
  productId: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  quantity: number;
  subtotal: number;
  image: string;
  imageAlt: string;
}

export function CartLines({ lines }: { lines: CartLineView[] }) {
  const track = useTrack();
  const [pending, startTransition] = useTransition();

  const change = (line: CartLineView, quantity: number) => {
    track(quantity === 0 ? "cart.removed" : "cart.updated", {
      product_id: line.productId,
      product_slug: line.slug,
      category: line.category,
      price_band: priceBand(line.price),
      currency: ANALYTICS_CURRENCY,
      quantity,
      previous_quantity: line.quantity,
      line_value: line.price * quantity,
      funnel_stage: quantity === 0 ? "removed" : "cart",
    });
    startTransition(() => setQuantityAction(line.productId, quantity));
  };

  return (
    <ul className="flex flex-col gap-4" data-testid="cart-lines">
      {lines.map((line) => (
        <li
          key={line.productId}
          className="grid grid-cols-[5rem_1fr] gap-4 rounded-[var(--opt-radius-lg)] border border-border bg-surface-raised p-4 shadow-[var(--opt-shadow-sm)] sm:grid-cols-[6rem_1fr_auto] sm:items-center"
        >
          <div className="relative aspect-square overflow-hidden rounded-[var(--opt-radius-md)] bg-bg-subtle">
            <Image
              src={line.image}
              alt={line.imageAlt}
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className="object-cover"
            />
          </div>
          <div>
            <Link
              href={`/products/${line.slug}`}
              className="focus-ring rounded font-semibold hover:text-accent"
            >
              {line.name}
            </Link>
            <p className="mt-1 text-sm text-text-secondary">
              {formatWon(line.price)}
            </p>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => change(line, 0)}
              className="mt-3"
            >
              Remove
            </Button>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-4 sm:col-auto sm:flex-col sm:items-end">
            <div
              className="flex items-center gap-1 rounded-full border border-border p-1"
              aria-label={`Quantity for ${line.name}`}
            >
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => change(line, line.quantity - 1)}
              >
                <span aria-hidden="true">−</span>
                <span className="sr-only">Decrease quantity</span>
              </Button>
              <span
                className="w-8 text-center"
                data-testid={`qty-${line.slug}`}
              >
                {line.quantity}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => change(line, line.quantity + 1)}
              >
                <span aria-hidden="true">+</span>
                <span className="sr-only">Increase quantity</span>
              </Button>
            </div>
            <span className="font-semibold">{formatWon(line.subtotal)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
