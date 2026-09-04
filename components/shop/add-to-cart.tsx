"use client";

import { useTrack } from "@reopt-ai/data-sdk-client/next";
import { Button, toast } from "@reopt-ai/opt-ui";
import { useTransition } from "react";

import { addToCartAction } from "@/app/actions";
import { ANALYTICS_CURRENCY, priceBand } from "@/lib/reopt/commerce-analytics";
import type { ProductCategory } from "@/lib/shop/catalog";

/**
 * `cart.added` is sent from the browser, next to the click that caused it.
 *
 * The server action that follows changes the cart; it does not send a second
 * event. One interaction, one event — a server-side twin would double every
 * add-to-cart in the funnel.
 */
export interface AddToCartProduct {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
}

export function AddToCartButton({ product }: { product: AddToCartProduct }) {
  const track = useTrack();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      loading={pending}
      data-testid="add-to-cart"
      onClick={() => {
        track("cart.added", {
          product_id: product.id,
          product_slug: product.slug,
          category: product.category,
          price: product.price,
          price_band: priceBand(product.price),
          currency: ANALYTICS_CURRENCY,
          quantity: 1,
          cart_value: product.price,
          funnel_stage: "cart",
        });
        startTransition(async () => {
          await addToCartAction(product.id);
          toast.success(`${product.name} added to cart`);
        });
      }}
    >
      Add to cart
    </Button>
  );
}
