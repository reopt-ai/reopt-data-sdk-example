"use server";

import { randomUUID } from "node:crypto";

import { currentSession } from "@/lib/auth";
import { shopAiTelemetry } from "@/lib/reopt/ai-telemetry";
import { getReopt } from "@/lib/reopt/server";
import { diagnosticsEnabled } from "@/lib/runtime-config";
import {
  AssistantQuestion,
  runAssistantTurn,
  type AssistantTurn,
} from "@/lib/shop/assistant";
import { assistantModel } from "@/lib/shop/assistant-model";

/**
 * One assistant turn, from a Server Action.
 *
 * The visitor is read the same way `placeOrderAction` reads it: from the
 * request-scoped client, which verified the device cookie, and from the auth
 * session — never from the page. Both ride into the model call as
 * `runtimeContext` and come out on every AI event.
 *
 * `chatId` is minted per turn here because the lab has no conversation store.
 * A chat feature would pass its thread id, so every turn of one conversation
 * shares a `$ai_session_id`.
 */
export async function askAssistantAction(
  question: string,
  chatId?: string,
): Promise<AssistantTurn & { live: boolean }> {
  if (!diagnosticsEnabled()) throw new Error("Not available");
  const parsed = AssistantQuestion.parse(question);
  const [reopt, session] = await Promise.all([getReopt(), currentSession()]);
  const { model, live } = assistantModel();

  const turn = await runAssistantTurn({
    question: parsed,
    visitor: {
      deviceId: reopt.deviceId ?? null,
      profileId: session?.userId ?? null,
      chatId: chatId && /^[0-9a-f-]{36}$/i.test(chatId) ? chatId : randomUUID(),
    },
    model,
    telemetry: shopAiTelemetry(),
  });
  return { ...turn, live };
}
