import { dirname } from "node:path";
import type { NextConfig } from "next";

import { isSdkLinkedLocally } from "./lib/reopt/sdk-resolution";

/**
 * Turbopack resolves modules only inside the project root, so `pnpm sdk:local`
 * — which points the SDK at `../reopt-data/packages/*` — needs the root widened
 * to the directory holding both checkouts. Without this, `next dev` happens to
 * work and `next build` fails with "Can't resolve @reopt-ai/data-contract".
 *
 * Conditional, and detected from where the packages actually resolved rather
 * than from an env var: widening the root costs filesystem watching and cache
 * validation, and there is no reason to pay that in the default npm mode.
 */
const sdkIsLinked = isSdkLinkedLocally();

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value:
      "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(sdkIsLinked ? { turbopack: { root: dirname(process.cwd()) } } : {}),
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
