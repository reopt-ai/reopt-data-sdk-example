import type { LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { PRODUCTS } from "./catalog";

/**
 * Which model answers the assistant.
 *
 * With `AI_GATEWAY_API_KEY` set, a string model id resolves through the Vercel
 * AI Gateway, and the integration reads the gateway's reported cost and
 * generation id off the response. Without one — every fresh checkout of this
 * repo — a scripted mock from `ai/test` plays the part. It goes through the
 * same `generateText`, fires the same telemetry hooks, and calls the same
 * tool, so the events reopt receives have the same shape either way. Only the
 * token counts are made up.
 */
export const GATEWAY_MODEL_ID = "anthropic/claude-haiku-4-5";

export function assistantModel(): { model: LanguageModel; live: boolean } {
  if (process.env.AI_GATEWAY_API_KEY) {
    return { model: GATEWAY_MODEL_ID, live: true };
  }
  return { model: scriptedModel(), live: false };
}

/** The mock consumes its script in call order, so each turn gets its own. */
function scriptedModel(): LanguageModel {
  const product = PRODUCTS[0]!;
  const usage = (input: number, output: number) => ({
    inputTokens: {
      total: input,
      noCache: input,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: output, text: output, reasoning: undefined },
  });
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "arc-supply-scripted",
    doGenerate: [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "call-lookup",
            toolName: "lookupProduct",
            input: JSON.stringify({ slug: product.slug }),
          },
        ],
        finishReason: { unified: "tool-calls", raw: "tool_calls" },
        usage: usage(320, 24),
        warnings: [],
      },
      {
        content: [
          {
            type: "text",
            text:
              `${product.name} is ${product.blurb.toLowerCase()} and is in ` +
              `stock right now. (Scripted answer: set AI_GATEWAY_API_KEY for a real model.)`,
          },
        ],
        finishReason: { unified: "stop", raw: "stop" },
        usage: usage(410, 38),
        warnings: [],
      },
    ],
  });
}
