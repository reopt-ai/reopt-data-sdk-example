import "server-only";

import { headers } from "next/headers";

import { storedTenantForHost, unsafeTenantStore } from "./tenants";

export interface ServerCredentials {
  clientId: string;
  clientSecret: string;
}

/** Server credentials for the project selected by the current request host. */
export async function currentServerCredentials(): Promise<ServerCredentials | null> {
  const tenant = storedTenantForHost((await headers()).get("host"));
  if (!tenant?.clientId || !tenant.clientSecret) return null;
  return { clientId: tenant.clientId, clientSecret: tenant.clientSecret };
}

/**
 * Startup credentials for instrumentation, which has no request host. The
 * example supports one instrumentation project; request tracking remains
 * fully host-resolved.
 */
export function instrumentationCredentials():
  | (ServerCredentials & {
      writeKey: string;
    })
  | null {
  const tenant = unsafeTenantStore()?.projects[0];
  if (!tenant?.clientId || !tenant.clientSecret || !tenant.writeKey)
    return null;
  return {
    writeKey: tenant.writeKey,
    clientId: tenant.clientId,
    clientSecret: tenant.clientSecret,
  };
}
