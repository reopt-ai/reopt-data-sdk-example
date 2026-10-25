import type { FullConfig } from "@playwright/test";

/**
 * `next dev` compiles a route on its first request. Left to the specs, the
 * first visit to a page spends its assertion timeouts waiting for the compiler
 * (40-50s on a cold isolated run), and an unrelated wait such as a sign-in or
 * a feedback event fails. Every route the specs visit is requested once here,
 * after the web server is up and before the first test.
 *
 * Development only: a production server has nothing to compile.
 */
const ROUTES = [
  "/",
  "/products",
  "/products/aster-65",
  "/cart",
  "/checkout",
  "/checkout/success",
  "/orders",
  "/account",
  "/guide",
  "/lab",
  "/lab/ai",
  "/debug/errors",
  "/debug/replay",
  // API routes compile on any method; a 4xx answer is enough.
  "/api/auth/get-session",
  "/api/consent",
  "/api/orders",
];

export default async function warmDevServer(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  for (const route of ROUTES) {
    const response = await fetch(new URL(route, baseURL), {
      redirect: "manual",
      signal: AbortSignal.timeout(120_000),
    });
    await response.arrayBuffer();
    if (response.status >= 500)
      throw new Error(`Warming ${route} failed (${response.status})`);
  }
}
