import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

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
  ...(process.env.REOPT_DATA_LOCAL_LINKS === "true"
    ? {
        // Turbopack intentionally refuses linked files outside its root. The
        // local stack opts into the common parent of this app and reopt-data.
        turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
      }
    : {}),
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
