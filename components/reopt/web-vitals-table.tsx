"use client";

import { Card, CardContent } from "@reopt-ai/opt-ui";
import { useDevtoolsState } from "@reopt-ai/data-sdk-devtool/react";

import { devtools } from "@/lib/reopt/devtools";

/**
 * The `$web_vitals` events this page produced, read back out of the recorded
 * batches. `<ReoptWebVitals />` forwards what Next reports; nothing here
 * measures anything itself.
 */
export function WebVitalsTable() {
  const state = useDevtoolsState(devtools);

  const vitals = state.batches
    .flatMap((batch) => batch.events)
    .map((event) => event.payload)
    .filter(
      (payload): payload is NonNullable<typeof payload> =>
        payload?.name === "$web_vitals",
    );

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <h2 className="font-medium">Core Web Vitals</h2>
        {vitals.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No metrics yet. TTFB, FCP, and LCP arrive after loading; CLS and INP
            require interaction.
          </p>
        ) : (
          <table className="w-full text-sm" data-testid="web-vitals">
            <thead className="text-left text-text-secondary">
              <tr>
                <th className="py-1">Metric</th>
                <th>Value</th>
                <th>Rating</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {vitals.map((vital, index) => (
                <tr key={index}>
                  <td className="py-1">
                    {String(vital.properties?.metric_name ?? "?")}
                  </td>
                  <td>{Number(vital.properties?.value ?? 0).toFixed(1)}</td>
                  <td>{String(vital.properties?.rating ?? "-")}</td>
                  <td>{String(vital.properties?.path ?? "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
