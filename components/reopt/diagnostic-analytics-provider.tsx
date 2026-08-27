"use client";

import {
  AnalyticsProviderWithTransport,
  type AnalyticsTransport,
  type AnalyticsProviderProps,
} from "@/components/reopt/analytics-provider";
import { devtools } from "@/lib/reopt/devtools";

const DIAGNOSTIC_TRANSPORT: AnalyticsTransport = {
  fetch: devtools.fetch,
};

/** Adds recorder hooks only for an explicitly diagnostic render. */
export function DiagnosticAnalyticsProvider(props: AnalyticsProviderProps) {
  return (
    <AnalyticsProviderWithTransport
      {...props}
      transport={DIAGNOSTIC_TRANSPORT}
    />
  );
}
