/**
 * Next.js instrumentation — server-side error capture and demo data.
 *
 * `onRequestError` turns a server error into a `$exception` event on the same
 * project as the page views, which is the point: an error rate is only
 * interesting next to the funnel it interrupts.
 */

import { createOnRequestError } from "@reopt-ai/data-sdk-server";

import { instrumentationCredentials } from "@/lib/reopt/credentials";
import { reoptBaseUrl } from "@/lib/reopt/tenants";
import { validateRuntimeConfig } from "@/lib/runtime-config";

/** Runs once when a server runtime starts; Next.js skips it during builds. */
export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") validateRuntimeConfig();
}

const tenant = instrumentationCredentials();

/**
 * One project, resolved at boot: `onRequestError` runs outside a request scope,
 * so there is no host to resolve a tenant from. A multi-brand deployment would
 * pick the project from `context.routePath`, or forgo server exception capture.
 *
 * `disabled` rather than a conditional export, so the shape of this module does
 * not depend on whether credentials happen to be configured.
 */
export const onRequestError = createOnRequestError({
  disabled: !tenant,
  // The SDK accepts an unconfigured project as a disabled integration. That
  // keeps application errors independent from analytics availability.
  writeKey: tenant?.writeKey,
  clientId: tenant?.clientId,
  clientSecret: tenant?.clientSecret,
  baseUrl: reoptBaseUrl(),
  beforeCapture: ({ context }) => ({
    // Merged into the event's properties. Returning `false` would drop it.
    shop_router: context.routerKind,
    shop_route: context.routePath,
  }),
});
