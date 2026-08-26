import {
  consentCookieName,
  OPT_OUT_CONSENT_CATEGORY,
  serializeConsentCookie,
} from "@reopt-ai/data-contract/identity";
import { NextResponse } from "next/server";
import { z } from "zod";

import { currentWriteKey } from "@/lib/reopt/server";

/**
 * Tells the server what an external consent banner decided.
 *
 * Needed because the two features do not meet on their own: with
 * `consent.persist: false` the browser SDK deliberately keeps no consent cookie
 * — the banner owns the decision — but the proxy's "delete the device cookie on
 * opt-out" step reads exactly that cookie. Without this route the visitor
 * refuses, the browser stops sending, and the server keeps identifying them on
 * every request. Refusing has to mean "forget me".
 *
 * The cookie name and format come from `@reopt-ai/data-contract/identity`, not
 * from a string built here: the name is derived from the write key, and a
 * second copy of that rule in this repo would drift from the SDK's.
 */

/**
 * `serializeConsentCookie` returns a percent-encoded value, while
 * `NextResponse.cookies.set()` performs its own encoding. Decode once so the
 * value has exactly one encoding layer when it reaches the browser.
 */
function cookieValueForNext(encoded: string): string {
  return decodeURIComponent(encoded);
}
const Body = z.object({ granted: z.boolean() });

export async function POST(request: Request): Promise<Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const writeKey = await currentWriteKey();
  // No project, no cookie name to derive — and nothing to record.
  if (!writeKey) return NextResponse.json({ ok: true, recorded: false });

  const response = NextResponse.json({ ok: true, recorded: true });
  const value = serializeConsentCookie({
    [OPT_OUT_CONSENT_CATEGORY]: parsed.data.granted,
  });
  response.cookies.set(consentCookieName(writeKey), cookieValueForNext(value), {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 400 * 24 * 60 * 60,
  });
  return response;
}
