"use client";

import dynamic from "next/dynamic";

import {
  AnalyticsProviderWithTransport,
  type AnalyticsTransport,
  type AnalyticsProviderProps,
} from "@/components/reopt/analytics-provider";
import { devtools } from "@/lib/reopt/devtools";

const ReplayAnalyticsProvider = dynamic(
  () => import("./replay-analytics-provider"),
);

const observer = (
  devtools as typeof devtools & {
    observe?: (observation: unknown) => void;
  }
).observe;

const DIAGNOSTIC_TRANSPORT: AnalyticsTransport = {
  fetch: devtools.fetch,
  ...(observer ? { observe: observer } : {}),
};

/** Adds recorder hooks only for an explicitly diagnostic render. */
export function DiagnosticAnalyticsProvider(props: AnalyticsProviderProps) {
  if (props.config.flags.sessionReplay)
    return (
      <ReplayAnalyticsProvider {...props} transport={DIAGNOSTIC_TRANSPORT} />
    );
  return (
    <AnalyticsProviderWithTransport
      {...props}
      transport={DIAGNOSTIC_TRANSPORT}
    />
  );
}
