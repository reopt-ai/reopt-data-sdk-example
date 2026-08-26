import { diagnosticsEnabled } from "@/lib/runtime-config";

/**
 * A route that fails on purpose, so `onRequestError` in `instrumentation.ts`
 * has something to capture. The `$exception` it sends carries the Next.js
 * routing context — router kind, route path, render source.
 */
export function GET(): Response {
  if (!diagnosticsEnabled()) return new Response(null, { status: 404 });
  throw new Error("Intentional example server error: /api/boom");
}
