import { Card, CardContent, PageHeader } from "@reopt-ai/opt-ui";
import { cookies } from "next/headers";

import { InstrumentationLab } from "@/components/reopt/instrumentation-lab";
import { WebVitalsTable } from "@/components/reopt/web-vitals-table";
import { FLAGS_COOKIE, parseFlags } from "@/lib/reopt/flags";
import { diagnosticsEnabled } from "@/lib/runtime-config";

export const metadata = { title: "Instrumentation lab" };

/**
 * The automatic events, each with a way to make it happen on demand:
 * `$exception`, `$pageleave` with its scroll depth, `$web_vitals`.
 */
export default async function LabPage() {
  const flags = parseFlags((await cookies()).get(FLAGS_COOKIE)?.value);
  const showDiagnostics = diagnosticsEnabled();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Instrumentation lab"
        description={
          showDiagnostics
            ? "Trigger automatic events on demand and inspect them in SDK devtools."
            : "Trigger browser-side automatic events on demand. Server diagnostics are disabled in production."
        }
      />

      <InstrumentationLab
        exceptionsEnabled={flags.exceptions}
        serverDiagnosticsEnabled={showDiagnostics}
      />

      <WebVitalsTable />

      <Card>
        <CardContent className="flex flex-col gap-2 py-5 text-sm">
          <h2 className="font-medium">Scroll depth</h2>
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
          className="shop-tall-section rounded border border-border p-6"
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
