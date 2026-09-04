/** Stable scenarios shared by the lab UI, E2E verification, and documentation. */
export const REOPT_SCENARIOS = {
  analyticsDemo: {
    eventNames: [
      "$pageview",
      "product.viewed",
      "cart.added",
      "checkout.started",
      "checkout.submitted",
      "order.completed",
    ],
    runIdProperty: "demo_run_id",
    cohortProperty: "demo_cohort",
  },
  roundtrip: {
    eventName: "lab.ping",
    runIdProperty: "demo_run_id",
    sourceProperty: "source",
    source: "instrumentation-lab",
  },
} as const;
