import { randomUUID } from "node:crypto";

import {
  ANALYTICS_CURRENCY,
  orderValueBand,
  priceBand,
} from "./commerce-analytics";
import { PRODUCTS } from "../shop/catalog";

export type AnalyticsDemoEventName =
  | "$pageview"
  | "product.viewed"
  | "cart.added"
  | "checkout.started"
  | "checkout.submitted"
  | "order.completed";

export interface AnalyticsDemoEvent {
  name: AnalyticsDemoEventName;
  properties: Record<string, unknown>;
}

export interface AnalyticsDemoJourney {
  cohortId: string;
  expectedChannel: string;
  deviceId: string;
  events: AnalyticsDemoEvent[];
}

export interface AnalyticsDemoCohort {
  id: string;
  expectedChannel: string;
  visitors: number;
  carts: number;
  checkouts: number;
  orders: number;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/** Deliberately uneven cohorts make channel and funnel comparisons meaningful. */
export const ANALYTICS_DEMO_COHORTS: readonly AnalyticsDemoCohort[] = [
  {
    id: "paid-search-brand",
    expectedChannel: "paid_search",
    visitors: 10,
    carts: 8,
    checkouts: 6,
    orders: 5,
    referrer: "https://www.google.com/search?q=workspace+setup",
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "workspace_brand",
  },
  {
    id: "newsletter-launch",
    expectedChannel: "email",
    visitors: 8,
    carts: 6,
    checkouts: 5,
    orders: 4,
    referrer: "https://mail.google.com/",
    utmSource: "arc_newsletter",
    utmMedium: "email",
    utmCampaign: "focus_launch",
  },
  {
    id: "paid-social-designers",
    expectedChannel: "paid_social",
    visitors: 8,
    carts: 5,
    checkouts: 3,
    orders: 2,
    referrer: "https://www.linkedin.com/feed/",
    utmSource: "linkedin",
    utmMedium: "paid_social",
    utmCampaign: "designer_desks",
  },
  {
    id: "organic-search",
    expectedChannel: "organic_search",
    visitors: 7,
    carts: 4,
    checkouts: 3,
    orders: 2,
    referrer: "https://search.naver.com/search.naver?query=desk+lighting",
    utmSource: "naver",
    utmMedium: "organic",
    utmCampaign: "evergreen_workspace",
  },
  {
    id: "partner-referral",
    expectedChannel: "referral",
    visitors: 5,
    carts: 3,
    checkouts: 2,
    orders: 1,
    referrer: "https://workspace-review.example/recommended",
    utmSource: "workspace_review",
    utmMedium: "referral",
    utmCampaign: "partner_guide",
  },
  {
    id: "direct",
    expectedChannel: "direct",
    visitors: 4,
    carts: 2,
    checkouts: 1,
    orders: 0,
    referrer: "",
  },
];

function acquisitionProperties(
  cohort: AnalyticsDemoCohort,
): Record<string, string> {
  return {
    ...(cohort.utmSource ? { utm_source: cohort.utmSource } : {}),
    ...(cohort.utmMedium ? { utm_medium: cohort.utmMedium } : {}),
    ...(cohort.utmCampaign ? { utm_campaign: cohort.utmCampaign } : {}),
  };
}

export function buildAnalyticsDemoJourneys(
  runId: string,
  createDeviceId: () => string = randomUUID,
): AnalyticsDemoJourney[] {
  return ANALYTICS_DEMO_COHORTS.flatMap((cohort, cohortIndex) =>
    Array.from({ length: cohort.visitors }, (_, visitorIndex) => {
      const product =
        PRODUCTS[(cohortIndex * 3 + visitorIndex) % PRODUCTS.length]!;
      const common = {
        demo_run_id: runId,
        demo_cohort: cohort.id,
        product_id: product.id,
        product_slug: product.slug,
        category: product.category,
        price_band: priceBand(product.price),
        currency: ANALYTICS_CURRENCY,
      };
      const events: AnalyticsDemoEvent[] = [
        {
          name: "$pageview",
          properties: {
            ...common,
            ...acquisitionProperties(cohort),
            path: "/products/:slug",
            origin: "https://arc-supply.example",
            title: product.name,
            referrer: cohort.referrer,
          },
        },
        {
          name: "product.viewed",
          properties: {
            ...common,
            price: product.price,
            funnel_stage: "viewed",
          },
        },
      ];

      if (visitorIndex < cohort.carts) {
        events.push({
          name: "cart.added",
          properties: {
            ...common,
            price: product.price,
            quantity: 1,
            cart_value: product.price,
            funnel_stage: "cart",
          },
        });
      }
      if (visitorIndex < cohort.checkouts) {
        events.push({
          name: "checkout.started",
          properties: {
            ...common,
            cart_value: product.price,
            item_count: 1,
            categories: [product.category],
            value_band: orderValueBand(product.price),
            funnel_stage: "checkout",
          },
        });
      }
      if (visitorIndex < cohort.orders) {
        events.push({
          name: "checkout.submitted",
          properties: {
            ...common,
            mode: visitorIndex % 2 === 0 ? "server-action" : "route-handler",
            cart_value: product.price,
            item_count: 1,
            categories: [product.category],
            value_band: orderValueBand(product.price),
            funnel_stage: "submitted",
          },
        });
        events.push({
          name: "order.completed",
          properties: {
            ...common,
            order_id: `demo_${runId}_${cohortIndex}_${visitorIndex}`,
            total: product.price,
            item_count: 1,
            categories: [product.category],
            source: visitorIndex % 2 === 0 ? "server-action" : "route-handler",
            value_band: orderValueBand(product.price),
            funnel_stage: "converted",
          },
        });
      }

      return {
        cohortId: cohort.id,
        expectedChannel: cohort.expectedChannel,
        deviceId: createDeviceId(),
        events,
      };
    }),
  );
}

export function summarizeAnalyticsDemo(
  journeys: readonly AnalyticsDemoJourney[],
) {
  const eventCounts = Object.fromEntries(
    (
      [
        "$pageview",
        "product.viewed",
        "cart.added",
        "checkout.started",
        "checkout.submitted",
        "order.completed",
      ] as const
    ).map((name) => [
      name,
      journeys
        .flatMap((journey) => journey.events)
        .filter((event) => event.name === name).length,
    ]),
  ) as Record<AnalyticsDemoEventName, number>;

  return {
    journeys: journeys.length,
    events: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),
    channels: new Set(journeys.map((journey) => journey.expectedChannel)).size,
    eventCounts,
  };
}
