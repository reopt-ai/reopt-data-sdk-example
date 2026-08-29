import { diagnosticsEnabled } from "@/lib/runtime-config";

/**
 * A route handler that fails on purpose, for the `onRequestError` path.
 *
 * Separate from `/api/boom` so the two demos can differ: this one throws a
 * typed error with a `cause`, which is what a real server failure looks like
 * once it has crossed a layer, and it is what the issue detail's chain view
 * exists to show.
 */
export function GET(): Response {
  if (!diagnosticsEnabled()) return new Response(null, { status: 404 });
  const cause = new TypeError("orders.total is not a function");
  throw new Error("Intentional example server error: /api/debug/error", {
    cause,
  });
}
