import "server-only";

import {
  createReoptAiTelemetry,
  type ReoptAiTelemetry,
} from "@reopt-ai/data-sdk-server/ai";
import { createReoptNode } from "@reopt-ai/data-sdk-server/node";

import { ASSISTANT_RUNTIME_KEYS } from "@/lib/shop/assistant";
import { instrumentationCredentials } from "./credentials";
import { reoptBaseUrl } from "./tenants";

/**
 * AI observability for the Vercel AI SDK, wired once for the process.
 *
 * **Why a process-wide node client and not `getReopt()`.** The integration
 * resolves its client on every callback, and a streamed response finishes
 * after the handler has returned — when `headers()` may no longer be readable.
 * A client that does not need the request cannot fail that way. Whose call it
 * was travels in `runtimeContext` instead, and `context` moves it onto the
 * event's device and profile.
 *
 * **Why it lives on `globalThis`.** Next compiles server actions, route
 * handlers and `instrumentation.ts` into separate module graphs; a module
 * constant here would mean one batching engine per graph. The same reason
 * `lib/auth.ts` pins its store to the process.
 *
 * **Why it is passed per call, not `registerTelemetry()`.** The AI SDK's global
 * registry is module state of `ai` itself, and `ai` is bundled into each of
 * those graphs too — a registration made in one graph is invisible to a
 * `generateText` in another, and there is no way to tell from the call site.
 * `telemetry.integrations` on the call is explicit, works from every graph,
 * and is what a unit test can hand a fake client through.
 *
 * Fail-open: without server credentials the source returns `null`, the
 * integration records nothing, and the assistant answers as before.
 */
const globalForAi = globalThis as unknown as {
  __shopAiTelemetry?: ReoptAiTelemetry;
  __shopAiTelemetryConfigured?: boolean;
};

function build(): ReoptAiTelemetry {
  const tenant = instrumentationCredentials();
  const reopt = tenant
    ? createReoptNode({
        clientId: tenant.clientId,
        clientSecret: tenant.clientSecret,
        baseUrl: reoptBaseUrl(),
      })
    : null;
  globalForAi.__shopAiTelemetryConfigured = reopt !== null;

  return createReoptAiTelemetry({
    reopt: () => reopt,
    context: (event) => {
      const read = (key: string): string | undefined => {
        const value = event.runtimeContext[key];
        return typeof value === "string" && value.length > 0
          ? value
          : undefined;
      };
      return {
        deviceId: read(ASSISTANT_RUNTIME_KEYS.deviceId),
        profileId: read(ASSISTANT_RUNTIME_KEYS.profileId),
        aiSessionId: read(ASSISTANT_RUNTIME_KEYS.chatId),
        // Low-cardinality only: this lands on every generation, span and trace.
        properties: { shop_surface: "assistant-lab" },
      };
    },
    // Provider and tool errors can quote the prompt back; the type and HTTP
    // status are what the dashboard groups on anyway.
    captureErrorMessages: false,
    onError: (error, stage) => {
      console.warn(`[reopt ai] ${stage}:`, error);
    },
  });
}

/** The process-wide integration. Pass it as `telemetry.integrations` on each call. */
export function shopAiTelemetry(): ReoptAiTelemetry {
  return (globalForAi.__shopAiTelemetry ??= build());
}

/** Whether AI events have somewhere to go — for the lab page's status badge. */
export function aiTelemetryConfigured(): boolean {
  shopAiTelemetry();
  return globalForAi.__shopAiTelemetryConfigured === true;
}
