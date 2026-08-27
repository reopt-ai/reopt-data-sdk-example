/**
 * Public, request-safe project configuration.
 *
 * This module is shared with `proxy.ts`, so it deliberately contains no server
 * credentials and no filesystem access. A deployment configures one example
 * project through environment variables; applications that need host-based
 * multi-tenancy can replace this adapter with their own public project store.
 */

export const DEFAULT_REOPT_DATA_BASE_URL = "https://data.reopt.ai";

export interface TenantRecord {
  name: string;
  /** Public identifier used only for an authenticated console deep link. */
  projectId: string | null;
  writeKey: string;
}

/** The reopt Data origin this example talks to. */
export function reoptBaseUrl(): string {
  return process.env.REOPT_DATA_BASE_URL ?? DEFAULT_REOPT_DATA_BASE_URL;
}

/**
 * The public project serving this request, or `null` when analytics are not
 * configured. The host argument keeps the request-resolver boundary explicit
 * for readers extending this example to multiple projects.
 */
export function tenantForHost(
  _host: string | null | undefined,
): TenantRecord | null {
  const writeKey = process.env.REOPT_DATA_WRITE_KEY;
  if (!writeKey) return null;
  return {
    name: "environment",
    projectId: process.env.REOPT_DATA_PROJECT_ID ?? null,
    writeKey,
  };
}

/** The public write key for `host`; `null` preserves fail-open analytics. */
export function writeKeyForHost(
  host: string | null | undefined,
): string | null {
  return tenantForHost(host)?.writeKey ?? null;
}
