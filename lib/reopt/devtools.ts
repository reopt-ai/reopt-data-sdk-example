import { createDevtools } from "@reopt-ai/data-sdk-devtool";

/**
 * The SDK devtools instance: its `fetch` is what the browser client sends
 * through, and its store is what the panel, the Web Vitals table and the
 * Playwright specs read.
 *
 * `createDevtools()` is off under `NODE_ENV=production` on its own. This app
 * is the reference deployment for the SDK, so it forces the panel on: seeing
 * what the SDK sends is the point of the example, and the payloads it shows
 * belong to the visitor looking at them. A customer application keeps the
 * default.
 */
export const devtools = createDevtools({ enabled: true });
