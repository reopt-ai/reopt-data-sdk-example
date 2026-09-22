import type { ReoptAiTelemetry } from "@reopt-ai/data-sdk-server/ai";
import { generateText, isStepCount, tool, type LanguageModel } from "ai";
import { z } from "zod";

import { CATEGORIES, findProduct, PRODUCTS } from "./catalog";

/**
 * One turn of the shop assistant, and everything reopt learns from it.
 *
 * The AI SDK call is untouched by analytics: the integration from
 * `lib/reopt/ai-telemetry.ts` rides along as `telemetry.integrations` and sees
 * the model steps and the tool execution through the AI SDK's own hooks. What
 * this module adds on top is the shape a real feature needs and the automatic
 * path cannot know:
 *
 * - `withAiTrace` groups the turn — the catalogue read, the model call, the
 *   tool it asks for — into one `$ai_trace`, and hands back the trace id the
 *   page needs to file a thumbs-up against.
 * - `captureAiSpan` records the step that is not an AI SDK call. A turn spends
 *   time before the model, and a trace that starts at the first token hides it.
 * - `runtimeContext` carries the visitor — device, profile — from the request
 *   into the events. The integration reads it in `context`, so the same keys
 *   must be switched on in `includeRuntimeContext`.
 */
export interface AssistantVisitor {
  deviceId: string | null;
  profileId: string | null;
  /** The conversation the turn belongs to → `$ai_session_id`. */
  chatId: string;
}

export interface AssistantTurn {
  answer: string;
  traceId: string;
  model: string;
  toolCalls: string[];
}

/** The runtime keys the integration reads back. Kept in one place so both sides agree. */
export const ASSISTANT_RUNTIME_KEYS = {
  deviceId: "shop.device_id",
  profileId: "shop.profile_id",
  chatId: "shop.chat_id",
} as const;

export const ASSISTANT_FUNCTION_ID = "shop-assistant";
export const ASSISTANT_PROMPT_VERSION = "shop-assistant-v1";

export const AssistantQuestion = z
  .string()
  .trim()
  .min(1, "Ask something")
  .max(240, "Keep the question under 240 characters");

/** A catalogue snapshot small enough to hand a model as context. */
function catalogueSummary(): string {
  return CATEGORIES.map(
    (category) =>
      `${category.label}: ` +
      PRODUCTS.filter((product) => product.category === category.id)
        .map((product) => `${product.name} (${product.slug})`)
        .join(", "),
  ).join("\n");
}

export async function runAssistantTurn({
  question,
  visitor,
  model,
  telemetry,
}: {
  question: string;
  visitor: AssistantVisitor;
  model: LanguageModel;
  telemetry: ReoptAiTelemetry;
}): Promise<AssistantTurn> {
  return telemetry.withAiTrace(
    "assistant-turn",
    async ({ traceId }) => {
      // The work before the model. Not an AI SDK call, so the automatic path
      // never sees it — captured by hand, right after it finishes, with the
      // time it took.
      const startedAt = Date.now();
      const catalogue = catalogueSummary();
      telemetry.captureAiSpan({
        name: "catalogue.snapshot",
        latencyMs: Date.now() - startedAt,
      });

      const result = await generateText({
        model,
        system:
          "You are the assistant of Arc Supply, a small workspace-goods store. " +
          "Answer in one or two sentences. Use lookupProduct before quoting a " +
          "price or stock level.\n\nCatalogue:\n" +
          catalogue,
        prompt: question,
        tools: {
          lookupProduct: tool({
            description: "Price, stock and a short description of one product",
            inputSchema: z.object({
              slug: z.string().describe("The product slug from the catalogue"),
            }),
            execute: async ({ slug }) => {
              const product = findProduct(slug);
              if (!product) return { found: false as const };
              return {
                found: true as const,
                name: product.name,
                price: product.price,
                stock: product.stock,
                blurb: product.blurb,
              };
            },
          }),
        },
        stopWhen: isStepCount(3),
        runtimeContext: {
          [ASSISTANT_RUNTIME_KEYS.deviceId]: visitor.deviceId ?? undefined,
          [ASSISTANT_RUNTIME_KEYS.profileId]: visitor.profileId ?? undefined,
          [ASSISTANT_RUNTIME_KEYS.chatId]: visitor.chatId,
        },
        telemetry: {
          integrations: [telemetry],
          functionId: ASSISTANT_FUNCTION_ID,
          // A runtime key reaches the integration only when it is switched on
          // here. Leave one out and `context` sees an empty object for it.
          includeRuntimeContext: {
            [ASSISTANT_RUNTIME_KEYS.deviceId]: true,
            [ASSISTANT_RUNTIME_KEYS.profileId]: true,
            [ASSISTANT_RUNTIME_KEYS.chatId]: true,
          },
        },
      });

      return {
        answer: result.text,
        traceId,
        model: typeof model === "string" ? model : model.modelId,
        toolCalls: result.steps.flatMap((step) =>
          step.toolCalls.map((call) => call.toolName),
        ),
      };
    },
    {
      aiSessionId: visitor.chatId,
      ...(visitor.profileId ? { profileId: visitor.profileId } : {}),
      ...(visitor.deviceId ? { deviceId: visitor.deviceId } : {}),
      functionId: ASSISTANT_FUNCTION_ID,
      promptVersion: ASSISTANT_PROMPT_VERSION,
    },
  );
}
