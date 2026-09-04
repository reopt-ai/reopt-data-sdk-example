/** Shared, low-cardinality commerce dimensions used by live and seeded events. */
export const ANALYTICS_CURRENCY = "KRW" as const;

export type PriceBand = "entry" | "core" | "premium";
export type OrderValueBand = "under_100k" | "100k_to_249k" | "250k_plus";

export function priceBand(price: number): PriceBand {
  if (price < 100_000) return "entry";
  if (price < 200_000) return "core";
  return "premium";
}

export function orderValueBand(total: number): OrderValueBand {
  if (total < 100_000) return "under_100k";
  if (total < 250_000) return "100k_to_249k";
  return "250k_plus";
}
