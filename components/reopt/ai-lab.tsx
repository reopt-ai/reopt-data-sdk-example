"use client";

import { AI_EVENT_NAMES, AI_PROPERTIES } from "@reopt-ai/data-contract/ai";
import { useTrack } from "@reopt-ai/data-sdk-client/next";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  toast,
} from "@reopt-ai/opt-ui";
import { useState, useTransition } from "react";

import { askAssistantAction } from "@/app/lab/ai/actions";
import type { ShopEventName } from "@/lib/reopt/events";
import type { AssistantTurn } from "@/lib/shop/assistant";

/**
 * The assistant's one input and the two thumbs after it.
 *
 * The answer comes from a Server Action; the AI events go out from the server
 * and never touch this component. The rating is the one AI event the browser
 * sends itself: `$ai_feedback` is an ordinary `track()` with the trace id the
 * action handed back, so it lands in the same batch as everything else the
 * page sends and shows up in SDK devtools like any other event.
 */
export function AiLab() {
  const track = useTrack();
  const [question, setQuestion] = useState(
    "Is the Aster 65 in stock, and what does it cost?",
  );
  const [turn, setTurn] = useState<(AssistantTurn & { live: boolean }) | null>(
    null,
  );
  const [rated, setRated] = useState<1 | -1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rate(score: 1 | -1): void {
    if (!turn) return;
    track(AI_EVENT_NAMES.feedback satisfies ShopEventName, {
      [AI_PROPERTIES.traceId]: turn.traceId,
      [AI_PROPERTIES.feedbackScore]: score,
      [AI_PROPERTIES.feedbackLabel]: score > 0 ? "thumbs_up" : "thumbs_down",
    });
    setRated(score);
    toast.info(`Queued $ai_feedback (${score > 0 ? "+1" : "-1"})`);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setRated(null);
            startTransition(async () => {
              try {
                setTurn(await askAssistantAction(question));
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "The assistant failed",
                );
              }
            });
          }}
        >
          <Input
            aria-label="Question for the assistant"
            data-testid="ai-question"
            value={question}
            maxLength={240}
            onChange={(event) => setQuestion(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" data-testid="ai-ask" disabled={pending}>
            {pending ? "Asking…" : "Ask"}
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-danger-fg">
            {error}
          </p>
        )}

        {turn && (
          <section className="flex flex-col gap-3" data-testid="ai-answer">
            <p className="text-base leading-7">{turn.answer}</p>
            <dl className="grid gap-x-6 gap-y-1 text-sm text-text-secondary sm:grid-cols-[auto_1fr]">
              <dt>trace</dt>
              <dd className="font-mono" data-testid="ai-trace-id">
                {turn.traceId}
              </dd>
              <dt>model</dt>
              <dd className="font-mono">{turn.model}</dd>
              <dt>tools</dt>
              <dd className="font-mono" data-testid="ai-tool-calls">
                {turn.toolCalls.join(", ") || "none"}
              </dd>
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                data-testid="ai-thumbs-up"
                disabled={rated !== null}
                onClick={() => rate(1)}
              >
                Helpful
              </Button>
              <Button
                size="sm"
                variant="secondary"
                data-testid="ai-thumbs-down"
                disabled={rated !== null}
                onClick={() => rate(-1)}
              >
                Not helpful
              </Button>
              {rated !== null && (
                <Badge variant="success" data-testid="ai-rated">
                  rated {rated > 0 ? "+1" : "-1"}
                </Badge>
              )}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
