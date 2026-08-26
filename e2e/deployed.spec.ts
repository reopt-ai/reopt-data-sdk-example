import { expect, test } from "@playwright/test";

/**
 * Checks that only make sense against a real deployment: the proxy is on the
 * request path, ingest is served first-party, and the cookie is `Secure` over
 * https. Run with `SHOP_DEPLOYED_URL=… pnpm e2e:deployed`.
 */
test.describe("deployed application", () => {
  test("the proxy runs on the request path and seeds a device cookie", async ({
    page,
    baseURL,
  }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(
      response?.headers()["x-reopt-example-proxy"],
      "the proxy did not run",
    ).toBeDefined();

    const cookies = await page.context().cookies();
    const device = cookies.find(
      (cookie) =>
        cookie.name.startsWith("reopt_") && cookie.name.endsWith("_device"),
    );
    expect(device, "the device cookie is missing").toBeDefined();
    expect(
      device?.httpOnly,
      "the browser SDK must be able to read the cookie",
    ).toBe(false);
    if (baseURL?.startsWith("https:")) expect(device?.secure).toBe(true);
  });

  test("/ingest is rewritten through the first-party origin", async ({
    request,
  }) => {
    // No credentials: a 4xx from ingest proves the request reached it, which is
    // what this checks. A 404 would mean the rewrite never happened.
    const response = await request.post("/ingest/api/track", { data: [] });
    expect(
      response.status(),
      "a 404 means the proxy matcher omitted /ingest",
    ).not.toBe(404);
  });
});
