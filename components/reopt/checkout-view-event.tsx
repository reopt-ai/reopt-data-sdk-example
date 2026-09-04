"use client";

import { useTrack } from "@reopt-ai/data-sdk-client/next";
import { useEffect, useRef } from "react";

import {
  ANALYTICS_CURRENCY,
  orderValueBand,
} from "@/lib/reopt/commerce-analytics";

/** Records entry into checkout separately from a successful form submission. */
export function CheckoutViewEvent({
  cartValue,
  itemCount,
  categories,
}: {
  cartValue: number;
  itemCount: number;
  categories: string[];
}) {
  const track = useTrack();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("checkout.started", {
      cart_value: cartValue,
      item_count: itemCount,
      categories,
      currency: ANALYTICS_CURRENCY,
      value_band: orderValueBand(cartValue),
      funnel_stage: "checkout",
    });
  }, [cartValue, categories, itemCount, track]);

  return null;
}
