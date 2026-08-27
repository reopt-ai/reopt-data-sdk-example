import { Badge, Card, CardContent } from "@reopt-ai/opt-ui";

import { FEATURE_MAP } from "@/lib/reopt/feature-map";
import { sdkModeSummary } from "@/lib/reopt/sdk-mode";

export const metadata = { title: "SDK capability map" };

const AREA_LABEL: Record<string, string> = {
  browser: "browser",
  server: "server",
  proxy: "proxy",
  node: "node",
  test: "test",
};

export default function GuidePage() {
  const mode = sdkModeSummary();

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          SDK capability map
        </h1>
        <p className="mt-3 text-lg leading-8 text-text-secondary">
          Every reopt Data SDK capability exercised by this storefront, with the
          exact source that demonstrates it.
        </p>
      </header>

      <Card className="bg-bg-subtle">
        <CardContent className="flex flex-wrap gap-4 py-5 text-sm">
          {mode.map((entry) => (
            <span key={entry.name} className="font-mono">
              {entry.name}@{entry.version}
              <Badge
                className="ml-2"
                variant={entry.local ? "warning" : "default"}
              >
                {entry.local ? "local" : "npm"}
              </Badge>
            </span>
          ))}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-[var(--opt-radius-lg)] border border-border bg-surface-raised">
        <table
          className="w-full min-w-[760px] text-sm"
          data-testid="feature-map"
        >
          <thead className="border-b border-border text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3">Area</th>
              <th>API</th>
              <th>What it demonstrates</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_MAP.map((row) => (
              <tr
                key={`${row.area}-${row.api}`}
                className="border-b border-border align-top"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="info">
                    {AREA_LABEL[row.area] ?? row.area}
                  </Badge>
                </td>
                <td className="py-3 pr-4 font-mono whitespace-nowrap">
                  {row.api}
                </td>
                <td className="py-3 pr-4 text-text-secondary">{row.what}</td>
                <td className="py-3 pr-4 font-mono text-xs">{row.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
