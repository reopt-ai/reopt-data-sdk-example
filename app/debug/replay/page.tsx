import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ReplayLab } from "@/components/reopt/replay-lab";
import { FLAGS_COOKIE, parseFlags } from "@/lib/reopt/flags";
import { diagnosticsEnabled } from "@/lib/runtime-config";

export const metadata = { title: "Session replay" };

export default async function ReplayPage() {
  if (!diagnosticsEnabled()) notFound();
  const flags = parseFlags((await cookies()).get(FLAGS_COOKIE)?.value);
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">
          Session replay
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Record a synthetic visit, change the page, then inspect the recording
          in your project's replay console.
        </p>
      </header>
      <ReplayLab flags={flags} />
    </div>
  );
}
