import { createDevtools } from "@reopt-ai/data-sdk-devtool";

/**
 * The SDK devtools instance: its `fetch` is what the browser client sends
 * through, and its store is what the panel, the Web Vitals table and the
 * Playwright specs read.
 *
 * The instance is capable of recording in every build so an explicitly
 * enabled production diagnostics deployment can use it. Importing this module
 * does not patch global fetch or expose a global by itself: the server decides
 * whether to wire `devtools.fetch` into the client and mount the panel.
 */
export const devtools = createDevtools({ enabled: true });
