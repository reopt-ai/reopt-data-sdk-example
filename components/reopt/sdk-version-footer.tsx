import { Badge } from "@reopt-ai/opt-ui";

import type { SdkPackageVersion } from "@/lib/reopt/sdk-versions";

/** Installed SDK versions and request configuration, shown in diagnostics. */
export function SdkVersionFooter({
  versions,
  tenant,
  writeKey,
  baseUrl,
}: {
  versions: SdkPackageVersion[];
  tenant: string | null;
  writeKey: string | null;
  baseUrl: string;
}) {
  return (
    <footer className="border-t border-border px-6 py-4 text-xs text-text-secondary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <Badge variant="default">SDK: npm</Badge>
        {versions.map((entry) => (
          <span key={entry.name} className="font-mono">
            {entry.name.replace("@reopt-ai/", "")}@{entry.version}
          </span>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-3">
          <span>project: {tenant ?? "none"}</span>
          <span className="font-mono">
            {writeKey
              ? `${writeKey.slice(0, 10)}…`
              : "no write key (fail-open)"}
          </span>
          <span className="font-mono">ingest → {baseUrl}</span>
        </span>
      </div>
    </footer>
  );
}
