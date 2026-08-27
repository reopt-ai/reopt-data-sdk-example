/**
 * Proxy — public project resolution first, reopt last.
 *
 * Two jobs, in this order:
 *
 * 1. Resolve the public project configuration for this request. The example's
 *    adapter serves one environment project; a multi-brand app can replace it
 *    with host-aware lookup at the same boundary.
 * 2. Hand the response to `reoptProxy`, which seeds the visitor's device cookie
 *    and rewrites `/ingest/*` onto the reopt-data deployment.
 *
 * reopt goes last because a request this app does not render has nowhere to put
 * a cookie: a redirect or a rewrite to somewhere else would carry a `Set-Cookie`
 * the browser never applies to a page of ours.
 *
 * @see lib/reopt/tenants.ts — the request-safe public project adapter
 */

import { reoptProxy } from "@reopt-ai/data-sdk-server/proxy";
import { NextResponse, type NextRequest } from "next/server";

import { reoptBaseUrl, tenantForHost } from "@/lib/reopt/tenants";

const withReopt = reoptProxy({
  // A function, not an env var: which project a request belongs to is decided
  // by the request. Returning `null` skips seeding but still proxies ingest.
  writeKey: (request) =>
    tenantForHost(request.headers.get("host"))?.writeKey ?? null,
  baseUrl: reoptBaseUrl(),
  // `/ingest/*` → `${baseUrl}/*`. The browser SDK is configured with
  // `baseUrl: "/ingest"` and sends `/ingest/api/track`, so ingest arrives as
  // first-party traffic on this domain.
  proxy: true,
});

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  // Proves that the proxy ran without exposing a tenant or project name.
  response.headers.set("x-reopt-example-proxy", "active");

  return withReopt(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    // Redundant with the pattern above, which already lets `/ingest` through —
    // kept because a whitelist matcher is the common shape, and dropping this
    // line there turns every event batch into a silent 404 the SDK only retries.
    "/ingest/:path*",
  ],
};
