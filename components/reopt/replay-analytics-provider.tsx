"use client";

import {
  AnalyticsProviderWithTransport,
  type AnalyticsProviderProps,
  type AnalyticsTransport,
} from "./analytics-provider";
import replayAssets from "@/lib/reopt/replay-public-assets.json";

/** Keep the public image/font manifest out of diagnostics until replay is enabled. */
export default function ReplayAnalyticsProvider(
  props: AnalyticsProviderProps & { transport: AnalyticsTransport },
) {
  return (
    <AnalyticsProviderWithTransport {...props} replayAssets={replayAssets} />
  );
}
