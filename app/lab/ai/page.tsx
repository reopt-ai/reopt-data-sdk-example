import { Badge, Card, CardContent } from "@reopt-ai/opt-ui";
import { notFound } from "next/navigation";

import { AiLab } from "@/components/reopt/ai-lab";
import { aiTelemetryConfigured } from "@/lib/reopt/ai-telemetry";
import { diagnosticsEnabled } from "@/lib/runtime-config";
import { assistantModel, GATEWAY_MODEL_ID } from "@/lib/shop/assistant-model";

export const metadata = { title: "AI observability" };

/**
 * A shop assistant whose every model call, tool call and rating reaches reopt.
 *
 * The lab page covers the browser SDK's automatic events; this one covers the
 * server SDK's `/ai` entry point — the Vercel AI SDK integration — because the
 * events it produces have their own shape (`$ai_trace`, `$ai_generation`,
 * `$ai_span`, `$ai_feedback`) and their own dashboard.
 */
export default function AiLabPage() {
  if (!diagnosticsEnabled()) notFound();
  const configured = aiTelemetryConfigured();
  const { live } = assistantModel();

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          AI observability
        </h1>
        <p className="mt-3 text-lg leading-8 text-text-secondary">
          Ask the shop assistant a question. The model call, the tool it runs
          and your rating arrive in reopt as one trace.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge
            variant={configured ? "success" : "warning"}
            data-testid="ai-telemetry-status"
          >
            {configured
              ? "AI telemetry: server credentials configured"
              : "AI telemetry: no server credentials, recording nothing"}
          </Badge>
          <Badge variant={live ? "success" : "default"} data-testid="ai-model">
            {live ? `model: ${GATEWAY_MODEL_ID}` : "model: scripted mock"}
          </Badge>
        </div>
      </header>

      <AiLab />

      <Card className="bg-bg-subtle">
        <CardContent className="flex flex-col gap-2 py-6 text-sm">
          <h2 className="text-lg font-semibold">What is sent</h2>
          <p className="text-text-secondary">
            <code>withAiTrace</code> wraps the turn and returns the trace id the
            thumbs use. Inside it, a hand-captured <code>$ai_span</code> for the
            catalogue read, then <code>generateText</code> produces one{" "}
            <code>$ai_generation</code> per step and one <code>$ai_span</code>{" "}
            per tool execution, all through the integration registered in{" "}
            <code>lib/reopt/ai-telemetry.ts</code>. The rating is a plain
            browser <code>track(&quot;$ai_feedback&quot;)</code> carrying the
            trace id.
          </p>
          <p className="text-text-secondary">
            Without <code>AI_GATEWAY_API_KEY</code> a scripted model from{" "}
            <code>ai/test</code> answers; the telemetry path is the same.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
