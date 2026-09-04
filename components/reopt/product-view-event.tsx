"use client";

import { useTrack } from "@reopt-ai/data-sdk-client/next";
import { useEffect, useRef } from "react";

import { ANALYTICS_CURRENCY, priceBand } from "@/lib/reopt/commerce-analytics";
import type { ProductCategory } from "@/lib/shop/catalog";

export interface ProductViewEventProps {
  productId: string;
  productSlug: string;
  category: ProductCategory;
  price: number;
  analyticsContext?: Record<string, string>;
}

/** Gives funnel analysis a stable, property-rich first commerce step. */
export function ProductViewEvent({
  productId,
  productSlug,
  category,
  price,
  analyticsContext = {},
}: ProductViewEventProps) {
  const track = useTrack();
  const sentProductId = useRef<string | null>(null);

  useEffect(() => {
    if (sentProductId.current === productId) return;
    sentProductId.current = productId;
    track("product.viewed", {
      product_id: productId,
      product_slug: productSlug,
      category,
      price,
      price_band: priceBand(price),
      currency: ANALYTICS_CURRENCY,
      funnel_stage: "viewed",
      ...analyticsContext,
    });
  }, [analyticsContext, category, price, productId, productSlug, track]);

  return null;
}
