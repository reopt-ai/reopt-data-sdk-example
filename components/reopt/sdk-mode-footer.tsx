import { Badge } from "@reopt-ai/opt-ui";

import type { SdkPackageMode } from "@/lib/reopt/sdk-mode";

/**
 * Which SDK build is loaded, which project the page was tracked under, and
 * where ingest goes. A server component: all three are server facts, and the
 * write key is public by design.
 */
export function SdkModeFooter({
  mode,
  tenant,
  writeKey,
  baseUrl,
}: {
  mode: SdkPackageMode[];
  tenant: string | null;
  writeKey: string | null;
  baseUrl: string;
}) {
  const anyLocal = mode.some((entry) => entry.local);

  return (
    <footer className="border-t border-border px-6 py-4 text-xs text-text-secondary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <Badge variant={anyLocal ? "warning" : "default"}>
          {anyLocal ? "SDK: local" : "SDK: npm"}
        </Badge>
        {mode.map((entry) => (
          <span key={entry.name} className="font-mono">
            {entry.name.replace("@reopt-ai/", "")}@{entry.version}
            {entry.path ? " · linked checkout" : ""}
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
