import "server-only";

export interface ServerCredentials {
  clientId: string;
  clientSecret: string;
}

function serverCredentials(): ServerCredentials | null {
  const clientId = process.env.REOPT_DATA_CLIENT_ID;
  const clientSecret = process.env.REOPT_DATA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** Server credentials for SDK operations made during the current request. */
export async function currentServerCredentials(): Promise<ServerCredentials | null> {
  return serverCredentials();
}

/** Startup credentials for instrumentation, which has no request context. */
export function instrumentationCredentials():
  (ServerCredentials & { writeKey: string }) | null {
  const credentials = serverCredentials();
  const writeKey = process.env.REOPT_DATA_WRITE_KEY;
  if (!credentials || !writeKey) return null;
  return { ...credentials, writeKey };
}
