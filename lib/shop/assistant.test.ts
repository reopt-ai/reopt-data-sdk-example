import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { AI_EVENT_NAMES, AI_PROPERTIES } from "@reopt-ai/data-contract/ai";
import { createReoptAiTelemetry } from "@reopt-ai/data-sdk-server/ai";

import { assistantModel } from "./assistant-model";
import {
  ASSISTANT_FUNCTION_ID,
  ASSISTANT_RUNTIME_KEYS,
  runAssistantTurn,
} from "./assistant";

/**
 * The assistant's telemetry, end to end through the real `ai@7` and the real
 * integration, against a fake client that only remembers what it was asked to
 * send. No network, no key: the scripted model is the one a fresh checkout
 * runs, so this is the exact event sequence `/lab/ai` produces.
 */
function setup() {
  const sent: Array<{ name: string; properties: Record<string, unknown> }> = [];
  const failures: string[] = [];
  const telemetry = createReoptAiTelemetry({
    reopt: {
      track(event) {
        sent.push({ name: event.name, properties: event.properties ?? {} });
        return {
          eventId: "00000000-0000-4000-8000-000000000000",
          queued: true,
        };
      },
    },
    context: (event) => ({
      deviceId: event.runtimeContext[ASSISTANT_RUNTIME_KEYS.deviceId] as
        string | undefined,
      profileId: event.runtimeContext[ASSISTANT_RUNTIME_KEYS.profileId] as
        string | undefined,
      aiSessionId: event.runtimeContext[ASSISTANT_RUNTIME_KEYS.chatId] as
        string | undefined,
    }),
    onError: (error, stage) => failures.push(`${stage}: ${String(error)}`),
  });
  return { sent, failures, telemetry };
}

describe("runAssistantTurn", () => {
  test("one turn is one trace with a manual span, a tool span and two generations", async () => {
    const { sent, failures, telemetry } = setup();
    delete process.env.AI_GATEWAY_API_KEY;
    const { model, live } = assistantModel();
    assert.equal(live, false);

    const turn = await runAssistantTurn({
      question: "Is the Aster 65 in stock?",
      visitor: { deviceId: "dev-1", profileId: "user-1", chatId: "chat-1" },
      model,
      telemetry,
    });

    assert.deepEqual(failures, []);
    assert.match(turn.answer, /Aster 65/);
    assert.deepEqual(turn.toolCalls, ["lookupProduct"]);

    const names = sent.map((event) => event.name);
    assert.equal(
      names.filter((name) => name === AI_EVENT_NAMES.generation).length,
      2,
      "one generation per model step",
    );
    assert.equal(
      names.filter((name) => name === AI_EVENT_NAMES.trace).length,
      1,
      "withAiTrace sends the trace once, when the turn settles",
    );
    const spans = sent.filter((event) => event.name === AI_EVENT_NAMES.span);
    assert.deepEqual(
      spans.map((span) => span.properties[AI_PROPERTIES.spanName]).sort(),
      ["ai.generateText", "catalogue.snapshot", "lookupProduct"].sort(),
      "inside withAiTrace the operation is a span too, beside the hand-captured step and the tool execution",
    );
    assert.equal(
      spans.find((span) => span.properties[AI_PROPERTIES.toolName])?.properties[
        AI_PROPERTIES.toolName
      ],
      "lookupProduct",
    );

    for (const event of sent) {
      assert.equal(
        event.properties[AI_PROPERTIES.traceId],
        turn.traceId,
        `${event.name} belongs to the trace the page was handed`,
      );
    }
    const generation = sent.find(
      (event) => event.name === AI_EVENT_NAMES.generation,
    )!;
    assert.equal(
      generation.properties[AI_PROPERTIES.functionId],
      ASSISTANT_FUNCTION_ID,
    );
    assert.equal(generation.properties[AI_PROPERTIES.sessionId], "chat-1");
    assert.equal(
      generation.properties[AI_PROPERTIES.input],
      undefined,
      "content is off by default",
    );
  });

  test("records nothing when the client source answers null, and still answers", async () => {
    const telemetry = createReoptAiTelemetry({ reopt: () => null });
    const turn = await runAssistantTurn({
      question: "Hello",
      visitor: { deviceId: null, profileId: null, chatId: "chat-2" },
      model: assistantModel().model,
      telemetry,
    });
    assert.ok(turn.answer.length > 0);
    assert.ok(turn.traceId.length > 0);
  });
});
