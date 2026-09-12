import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

interface ReplayFixture {
  baseUrl: string;
  token: string;
  projectId: string;
  orgId: string;
  environment: { CRON_SECRET: string };
}
const fixturePath = process.env.REOPT_REPLAY_TEST_FIXTURE;
const fixture = fixturePath
  ? (JSON.parse(readFileSync(fixturePath, "utf8")) as ReplayFixture)
  : null;

test("records the real SDK DOM through the proxy, masks mutations, and revokes consent", async ({
  page,
}, testInfo) => {
  test.skip(
    !fixture,
    "Requires an isolated replay fixture; never run against a deployed project",
  );
  if (!fixture) return;
  test.setTimeout(120_000);
  // The fixture is created by the Data isolated test stack, never a production
  // session. Node fetch keeps credential headers out of browser diagnostics.
  const query = async (path: string, input: unknown) => {
    const response = await fetch(
      `${fixture.baseUrl}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`,
      { headers: { cookie: `reopt_session=${fixture.token}` } },
    );
    if (!response.ok)
      throw new Error(`Replay fixture query failed (${response.status})`);
    return (await response.json()).result.data.json;
  };
  const grants: Array<{
    streamId: string;
    sessionId: string;
    requestId: string;
  }> = [];
  const uploads: Array<{ bytes: string; requestId: string }> = [];
  page.on("response", async (response) => {
    const path = new URL(response.url()).pathname;
    if (!response.ok()) return;
    if (path.endsWith("/api/replay/start")) {
      const grant = await response.json();
      if (grant.sampled)
        grants.push({
          streamId: grant.streamId,
          sessionId: grant.sessionId,
          requestId: grant.requestId,
        });
    }
    if (path.endsWith("/api/replay/chunk"))
      uploads.push({
        bytes: response.request().postData() ?? "",
        requestId: (await response.json()).requestId,
      });
  });
  await page.goto("/debug/replay");
  const enable = page.getByRole("button", {
    name: "Enable replay SDK and reload",
  });
  if (await enable.isVisible()) await enable.click();
  await expect(page.getByTestId("replay-consent")).toBeEnabled();
  expect(grants).toHaveLength(0);
  await page.getByTestId("replay-consent").click();
  await expect
    .poll(
      async () => {
        await fetch(`${fixture.baseUrl}/api/cron/process-ingest?limit=100`, {
          headers: {
            authorization: `Bearer ${fixture.environment.CRON_SECRET}`,
          },
        });
        return grants.length;
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  // A start grant precedes rrweb's lazy import. Wait for the first actual
  // snapshot so the following edits exercise incremental capture as well.
  await expect.poll(() => uploads.length).toBeGreaterThan(0);
  const initialUploads = uploads.length;
  await page.getByLabel("Replay masked input").fill("SYNTHETIC_INPUT_PRIVATE");
  await page.getByTestId("replay-mutate").click();
  await page.getByTestId("replay-error").click();
  await page.getByTestId("replay-flush").click();
  await expect.poll(() => uploads.length).toBeGreaterThan(initialUploads);
  await expect
    .poll(() =>
      uploads.some((upload) => {
        const events = JSON.parse(upload.bytes).events as Array<{
          type: number;
          data: {
            source?: number;
            set?: { property?: string; value?: string };
          };
        }>;
        return events.some(
          (event) =>
            event.type === 3 &&
            event.data.source === 13 &&
            event.data.set?.property === "content" &&
            event.data.set.value === '"***"',
        );
      }),
    )
    .toBe(true);
  const stream = grants[grants.length - 1]!;
  await expect
    .poll(
      async () => {
        await fetch(`${fixture.baseUrl}/api/cron/process-ingest?limit=100`, {
          headers: {
            authorization: `Bearer ${fixture.environment.CRON_SECRET}`,
          },
        });
        const events = await query("analytics.analysisTools.replay.events", {
          projectId: fixture.projectId,
          streamId: stream.streamId,
        });
        return events.items.map((event: { name: string }) => event.name);
      },
      { timeout: 30_000 },
    )
    .toEqual(
      expect.arrayContaining(["replay.lab.layout_changed", "$exception"]),
    );
  await expect
    .poll(
      async () =>
        (
          await query("analytics.analysisTools.replay.manifest", {
            projectId: fixture.projectId,
            streamId: stream.streamId,
          })
        ).chunks.length,
    )
    .toBeGreaterThan(0);
  for (const upload of uploads) {
    expect(upload.bytes.includes("SYNTHETIC_INPUT_PRIVATE")).toBe(false);
    expect(upload.bytes.includes("REPLAY_PRIVATE_SENTINEL")).toBe(false);
    expect(upload.bytes.includes("REPLAY_CSS_PRIVATE")).toBe(false);
    expect(upload.bytes.includes("REPLAY_CSS_SECOND_PRIVATE")).toBe(false);
    expect(upload.bytes.includes("REPLAY_CSS_DYNAMIC_PRIVATE")).toBe(false);
  }
  await page.getByTestId("replay-stop").click();
  const count = uploads.length;
  await page.getByTestId("replay-mutate").click();
  await page.getByTestId("replay-flush").click();
  expect(uploads).toHaveLength(count);
  const run = await page.getByTestId("replay-run-id").innerText();
  await testInfo.attach("replay-correlation", {
    body: JSON.stringify({
      run,
      streamId: stream.streamId,
      sessionId: stream.sessionId,
      ingestRequestId: stream.requestId,
      chunkRequestIds: uploads.map((upload) => upload.requestId),
    }),
    contentType: "application/json",
  });

  await page
    .context()
    .addCookies([
      { name: "reopt_session", value: fixture.token, url: fixture.baseUrl },
    ]);
  await page.goto(
    `${fixture.baseUrl}/dashboard/${fixture.orgId}/${fixture.projectId}/replays?stream=${stream.streamId}`,
  );
  const player = page.getByRole("region", {
    name: "세션 리플레이",
    exact: true,
  });
  await expect(
    player.getByRole("button", { name: "재생", exact: true }),
  ).toBeEnabled({ timeout: 30_000 });
  const body = player
    .locator("iframe")
    .contentFrame()
    .locator("iframe")
    .contentFrame()
    .locator("body");
  await expect(body).toBeVisible();
  const publicImage = body.locator(".replay-public-image");
  await expect(publicImage).toHaveAttribute("src", /^data:image\/webp;base64,/);
  await expect
    .poll(() =>
      publicImage.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      body.evaluate(async (node) => {
        const fonts = node.ownerDocument.fonts;
        await fonts.load("14px ReplayPublicMono");
        return [...fonts].some(
          (font) =>
            font.family === "ReplayPublicMono" && font.status === "loaded",
        );
      }),
    )
    .toBe(true);
  const timeline = player.getByRole("region", { name: "녹화 이벤트 타임라인" });
  await timeline
    .getByRole("button", { name: "replay.lab.layout_changed", exact: true })
    .click();
  await expect(timeline.locator('[aria-current="step"]')).toContainText(
    "replay.lab.layout_changed",
  );
  await timeline.getByRole("button", { name: "오류", exact: true }).click();
  await timeline
    .getByRole("button", { name: "오류 발생", exact: true })
    .click();
  await expect(timeline.locator('[aria-current="step"]')).toContainText(
    "오류 발생",
  );
  expect((await body.innerText()).includes("REPLAY_PRIVATE_SENTINEL")).toBe(
    false,
  );
  await page.screenshot({ path: testInfo.outputPath("replay-player.png") });
});
