/** Stable scenarios shared by the lab UI, E2E verification, and documentation. */
export const REOPT_SCENARIOS = {
  roundtrip: {
    eventName: "lab.ping",
    runIdProperty: "demo_run_id",
    sourceProperty: "source",
    source: "instrumentation-lab",
  },
} as const;
