import "server-only";

import {
  consentCookieName,
  isOptedOut,
  parseConsentCookie,
} from "@reopt-ai/data-contract/identity";
import {
  createReopt,
  type RequestScopedReopt,
} from "@reopt-ai/data-sdk-server";
import type { ReoptBootstrap } from "@reopt-ai/data-sdk-server";
import { cookies, headers } from "next/headers";

import { currentSession } from "@/lib/auth";
import { currentServerCredentials } from "./credentials";
import { FLAGS_COOKIE, parseFlags } from "./flags";
import { reoptBaseUrl, tenantForHost, type TenantRecord } from "./tenants";

/**
 * The request-scoped server client — one factory, however many projects.
 *
 * Both identifiers are resolvers, and both describe the same row: `writeKey`
 * names the visitor's cookies, `credentials` authenticates the batch. Each runs
 * at most once per request through the SDK's own cache, and the engine is keyed
 * on the resolved credentials, so one factory still means one engine per
 * project rather than one per request.
 *
 * Created at module scope. Rebuilding it per request would throw away the
 * batching engine and that per-request cache — the two things this shape exists
 * to keep.
 */
const { getReopt: getScopedReopt, getBootstrap: getScopedBootstrap } =
  createReopt({
    writeKey: async () => (await currentTenant())?.writeKey ?? null,
    credentials: currentServerCredentials,
    baseUrl: reoptBaseUrl(),
    getProfileId: async () => (await currentSession())?.userId ?? null,
  });

/**
 * The project this request belongs to, or `null`.
 *
 * `null` covers both the unconfigured deployment and the fail-open toggle: a
 * missing write key is how the SDK is told "this request belongs to no
 * project", and it answers with a client that records nothing. No branch of
 * ours is needed for either.
 */
async function currentTenant(): Promise<TenantRecord | null> {
  const flags = parseFlags((await cookies()).get(FLAGS_COOKIE)?.value);
  if (flags.noWriteKey) return null;
  return tenantForHost((await headers()).get("host"));
}

/** A client already bound to the visitor behind this request. */
export async function getReopt(): Promise<RequestScopedReopt> {
  return getScopedReopt();
}

/** What the server already knows about this visitor, for the browser's first render. */
export async function getBootstrap(): Promise<ReoptBootstrap | null> {
  return getScopedBootstrap();
}

/** The write key this request's page should be tracked with. `null` = nothing is tracked. */
export async function currentWriteKey(): Promise<string | null> {
  return (await currentTenant())?.writeKey ?? null;
}

/**
 * Whether this visitor has refused analytics, as recorded on the server.
 *
 * Needed by the external-banner mode. With `consent.persist: false` the SDK
 * keeps no memory of its own, and an undecided visitor is allowed — so on every
 * load the client would start out allowed. Feeding the answer in as
 * `defaultConsent`, at creation, is what makes a refusal survive a reload.
 */
export async function currentConsentDefault(): Promise<boolean> {
  const writeKey = await currentWriteKey();
  if (!writeKey) return true;
  const raw = (await cookies()).get(consentCookieName(writeKey))?.value;
  return !isOptedOut(parseConsentCookie(raw));
}
