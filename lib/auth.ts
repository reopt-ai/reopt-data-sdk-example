import "server-only";

import { randomBytes } from "node:crypto";

import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

/**
 * Sign-in for the demo shop, on an in-memory database.
 *
 * The point of having auth here at all is the analytics boundary: a signed-in
 * visitor gives `identify()` a profile id in the browser and `getProfileId()`
 * one on the server, and the server's answer is the one that wins because a
 * session cannot be forged from the page. Persisting users past a restart adds
 * nothing to that, so the store is a plain object seeded on boot.
 */
/**
 * The store lives on `globalThis`, not in a module constant.
 *
 * Next compiles route handlers and server components into separate module
 * graphs, so `lib/auth.ts` is instantiated more than once in one server
 * process. With a plain module constant, `/api/auth/sign-in` writes the session
 * into one array and the page that renders "who am I" reads a different, empty
 * one — sign-in returns 200 and the page still shows the login form. Pinning it
 * to the process is the same trick a Prisma client needs here, for the same
 * reason.
 */
const globalForAuth = globalThis as unknown as { __shopAuthDb?: MemoryDB };
const memory: MemoryDB = (globalForAuth.__shopAuthDb ??= {
  user: [],
  session: [],
  account: [],
  verification: [],
});

const globalForDevelopmentSecret = globalThis as unknown as {
  __shopDevelopmentAuthSecret?: string;
};

/**
 * Development gets a process-local random secret so contributors can run the
 * example without setup. `instrumentation.register()` rejects a production
 * process that does not provide its own stable secret before it serves traffic.
 */
const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  (globalForDevelopmentSecret.__shopDevelopmentAuthSecret ??=
    randomBytes(32).toString("hex"));

export const auth = betterAuth({
  database: memoryAdapter(memory),
  secret: authSecret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4100",
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  // Last in the list, as the plugin's own docs require: it wraps the handlers
  // that came before it so their `Set-Cookie` reaches the Next response.
  plugins: [nextCookies()],
});

export const DEMO_ACCOUNTS = [
  { email: "sora@example.com", password: "shop-demo-1234", name: "Sora Kim" },
  {
    email: "jiwon@example.com",
    password: "shop-demo-1234",
    name: "Jiwon Park",
  },
] as const;

let seeding: Promise<void> | null = null;

/**
 * Creates the demo accounts once per process, on the first auth request.
 *
 * Not from `instrumentation.ts`: Next compiles instrumentation as its own
 * bundle, so the `auth` it imports is a *different* module instance with a
 * different in-memory database. Seeding there succeeds and then the sign-in
 * handler, in the app bundle, reports "User not found" — a confusing hour if
 * you have not hit it before.
 */
export function ensureDemoAccounts(): Promise<void> {
  seeding ??= seedDemoAccounts();
  return seeding;
}

async function seedDemoAccounts(): Promise<void> {
  for (const account of DEMO_ACCOUNTS) {
    try {
      await auth.api.signUpEmail({ body: { ...account } });
    } catch {
      // Already present — the only expected failure, and a demo login is not
      // worth failing server startup over in any case.
    }
  }
}

export interface ShopSession {
  userId: string;
  email: string;
  name: string;
}

/** The signed-in visitor for the current request, or `null`. */
export async function currentSession(): Promise<ShopSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}
