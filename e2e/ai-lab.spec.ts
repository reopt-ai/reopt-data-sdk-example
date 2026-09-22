import { expect, test } from "@playwright/test";

import { waitForEvent, waitForHydration } from "./fixtures";

/**
 * The browser half of AI observability.
 *
 * The AI events themselves leave from the server, so this spec cannot read
 * them from `window.__reoptDevtools`; `lib/shop/assistant.test.ts` pins that
 * sequence against the real AI SDK. What the browser owns is the rating, and
 * the trace id it has to carry — which is the seam this spec covers: the id
 * the action handed the page is the id `$ai_feedback` leaves with.
 */
test.describe("AI lab", () => {
  test("an answer arrives with a trace id, and the rating carries it", async ({
    page,
  }) => {
    await page.goto("/lab/ai");
    await waitForHydration(page);

    await expect(page.getByTestId("ai-telemetry-status")).toBeVisible();
    await page.getByTestId("ai-ask").click();
    await expect(page.getByTestId("ai-answer")).toBeVisible();

    const traceId = (
      await page.getByTestId("ai-trace-id").textContent()
    )?.trim();
    expect(traceId, "the action returns the trace the events share").toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    await expect(page.getByTestId("ai-tool-calls")).toHaveText("lookupProduct");

    await page.getByTestId("ai-thumbs-up").click();
    await expect(page.getByTestId("ai-rated")).toBeVisible();

    const feedback = await waitForEvent(page, "$ai_feedback");
    expect(feedback.payload?.properties?.$ai_trace_id).toBe(traceId);
    expect(feedback.payload?.properties?.$ai_feedback_score).toBe(1);
    expect(feedback.payload?.properties?.$ai_feedback_label).toBe("thumbs_up");
  });
});
