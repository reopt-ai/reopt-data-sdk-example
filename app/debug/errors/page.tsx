import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { ErrorLab } from "@/components/reopt/error-lab";
import { FLAGS_COOKIE, parseFlags } from "@/lib/reopt/flags";
import { diagnosticsEnabled } from "@/lib/runtime-config";

export const metadata = { title: "Error tracking" };

/**
 * Every shape an exception can arrive in, one button each.
 *
 * The lab page covers the automatic events in general; this one exists because
 * error tracking has more than one shape to cover — a thrown Error, a rejected
 * promise, a manual capture with its own grouping, a non-Error throw, and a
 * `cause` chain — and each renders differently in the issue detail. A single
 * "throw something" button would only ever exercise the first.
 */
export default async function DebugErrorsPage() {
  if (!diagnosticsEnabled()) notFound();
  const flags = parseFlags((await cookies()).get(FLAGS_COOKIE)?.value);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Error tracking
        </h1>
        <p className="mt-3 text-lg leading-8 text-text-secondary">
          Throw each shape of exception the SDK knows how to describe, then open
          the issue it lands on in reopt-data.
        </p>
      </header>

      <ErrorLab exceptionsEnabled={flags.exceptions} />
    </div>
  );
}
