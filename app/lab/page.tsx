import { Card, CardContent } from "@reopt-ai/opt-ui";
import { cookies } from "next/headers";

import { InstrumentationLab } from "@/components/reopt/instrumentation-lab";
import { WebVitalsTable } from "@/components/reopt/web-vitals-table";
import { FLAGS_COOKIE, parseFlags } from "@/lib/reopt/flags";
import { diagnosticsEnabled } from "@/lib/runtime-config";

export const metadata = { title: "Instrumentation lab" };

function validRunId(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^[0-9a-f-]{36}$/i.test(candidate)
    ? candidate
    : undefined;
}

/**
 * The automatic events, each with a way to make it happen on demand:
 * `$exception`, `$pageleave` with its scroll depth, `$web_vitals`.
 */
export default async function LabPage({
  searchParams,
}: {
  searchParams: Promise<{ demoRunId?: string | string[] }>;
}) {
  const flags = parseFlags((await cookies()).get(FLAGS_COOKIE)?.value);
  const showDiagnostics = diagnosticsEnabled();
  const demoRunId = validRunId((await searchParams).demoRunId);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Instrumentation lab
        </h1>
        <p className="mt-3 text-lg leading-8 text-text-secondary">
          {showDiagnostics
            ? "Trigger automatic events on demand and inspect them in SDK devtools."
            : "Trigger browser-side automatic events on demand. Server diagnostics are disabled in production."}
        </p>
      </header>

      <InstrumentationLab
        exceptionsEnabled={flags.exceptions}
        serverDiagnosticsEnabled={showDiagnostics}
        {...(demoRunId ? { demoRunId } : {})}
      />

      <WebVitalsTable />

      <Card className="bg-bg-subtle">
        <CardContent className="flex flex-col gap-2 py-6 text-sm">
          <h2 className="text-lg font-semibold">Scroll depth</h2>
          <p className="text-text-secondary">
            Scroll to the bottom and navigate elsewhere. This page's{" "}
            <code>$pageleave</code> event will include <code>scroll_depth</code>{" "}
            and <code>duration</code>.
          </p>
        </CardContent>
      </Card>

      {[1, 2, 3].map((index) => (
        <section
          key={index}
          className="shop-tall-section rounded-[var(--opt-radius-lg)] border border-border bg-gradient-to-b from-surface-raised to-bg-subtle p-6"
        >
          <h3 className="text-text-secondary">Scroll section {index} / 3</h3>
        </section>
      ))}

      <p className="text-sm text-text-secondary">
        At this point <code>scroll_depth</code> should be close to 100. Navigate
        to another page to emit the page-leave event.
      </p>
    </div>
  );
}
