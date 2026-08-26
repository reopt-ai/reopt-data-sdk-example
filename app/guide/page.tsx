import { Badge, Card, CardContent, PageHeader } from "@reopt-ai/opt-ui";

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="SDK capability map"
        description="Every Reopt Data SDK capability exercised by this application and the source that demonstrates it."
      />

      <Card>
        <CardContent className="flex flex-wrap gap-4 py-4 text-sm">
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="feature-map">
          <thead className="border-b border-border text-left text-text-secondary">
            <tr>
              <th className="py-2">Area</th>
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
                <td className="py-2 pr-4 whitespace-nowrap">
                  <Badge variant="info">
                    {AREA_LABEL[row.area] ?? row.area}
                  </Badge>
                </td>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {row.api}
                </td>
                <td className="py-2 pr-4 text-text-secondary">{row.what}</td>
                <td className="py-2 font-mono text-xs">{row.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
