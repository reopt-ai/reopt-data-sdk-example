import { toNextJsHandler } from "better-auth/next-js";

import { auth, ensureDemoAccounts } from "@/lib/auth";

/**
 * The demo accounts are created on the first request that needs them, in this
 * bundle — see `ensureDemoAccounts()` for why not at startup.
 */
const handlers = toNextJsHandler(auth);

export async function GET(request: Request): Promise<Response> {
  await ensureDemoAccounts();
  return handlers.GET(request);
}

export async function POST(request: Request): Promise<Response> {
  await ensureDemoAccounts();
  return handlers.POST(request);
}
