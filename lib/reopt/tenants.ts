/**
 * Which reopt-data project a request belongs to.
 *
 * Deliberately *not* an env var. A write key is per project, and the moment a
 * deployment serves more than one brand the answer stops being a build-time
 * constant — so this app resolves it from a store, keyed by host, the way the
 * SDK's multi-tenant guidance describes. `pnpm reopt:setup` writes that store.
 *
 * The write key ships in the page. Server credentials are consumed only by
 * server entry points; never pass a complete tenant record into a Client
 * Component.
 *
 * This module is also imported by `proxy.ts`, so it must not import
 * `server-only` — a Next proxy is not a server component and the guard would
 * refuse to resolve there.
 */

interface StoredTenantRecord {
  /** Hosts this project answers for, `host:port` as the browser sends it. */
  hosts: string[];
  name: string;
  writeKey: string;
  clientId: string;
  clientSecret: string;
}

export interface TenantStore {
  /** Origin of the reopt-data deployment these projects live in. */
  baseUrl: string;
  projects: StoredTenantRecord[];
}

/** The only tenant fields that application rendering is allowed to consume. */
export interface TenantRecord {
  hosts: string[];
  name: string;
  writeKey: string;
}

const STORE_FILE = ".reopt-local.json";

/**
 * Only a *successful* read is cached. Caching the miss would mean that running
 * `pnpm reopt:setup` against an existing server leaves it fail-open until the
 * next restart, which makes the configuration change unnecessarily surprising.
 */
let cached: TenantStore | null = null;

/**
 * The store as written by `pnpm reopt:setup`, or an env-var fallback so a
 * deployed copy can run without the file. `null` when neither is configured —
 * which is a supported state: the SDK fails open and the shop keeps working.
 */
export function unsafeTenantStore(): TenantStore | null {
  if (cached) return cached;
  cached = readStoreFile() ?? storeFromEnv();
  return cached;
}

// Type-only imports: erased at compile time, so they add nothing to any bundle.
// The values are required lazily below.
import type * as NodeFs from "node:fs";
import type * as NodePath from "node:path";

/**
 * `node:fs` is required lazily, and only off the Edge runtime.
 *
 * A static import would put `fs` in every bundle this module lands in — the
 * proxy, instrumentation, server components — and Next compiles an Edge variant
 * of the first two whether or not they run there, which turns a file read into
 * a build-time warning about an unsupported API.
 */
function readStoreFile(): TenantStore | null {
  if (process.env.NEXT_RUNTIME === "edge") return null;
  try {
    const { readFileSync } = require("node:fs") as typeof NodeFs;
    // `resolve` on a relative path already means "from the working directory";
    // calling `process.cwd()` here would only add a Node API for the Edge
    // bundler to warn about.
    const { resolve } = require("node:path") as typeof NodePath;
    const parsed = JSON.parse(
      readFileSync(resolve(STORE_FILE), "utf8"),
    ) as TenantStore;
    if (!parsed.projects?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeFromEnv(): TenantStore | null {
  const writeKey = process.env.REOPT_WRITE_KEY;
  if (!writeKey) return null;
  return {
    baseUrl: process.env.REOPT_BASE_URL ?? "http://localhost:4001",
    projects: [
      {
        hosts: ["*"],
        name: "env",
        writeKey,
        clientId: process.env.REOPT_CLIENT_ID ?? "",
        clientSecret: process.env.REOPT_CLIENT_SECRET ?? "",
      },
    ],
  };
}

/** The reopt-data origin every project in this app talks to. */
export function reoptBaseUrl(): string {
  return (
    unsafeTenantStore()?.baseUrl ??
    process.env.REOPT_BASE_URL ??
    "http://localhost:4001"
  );
}

/**
 * The project serving `host`, or `null`. A `"*"` entry matches anything, which
 * is how a single-tenant deployment configured through env vars behaves.
 */
export function tenantForHost(
  host: string | null | undefined,
): TenantRecord | null {
  const stored = storedTenantForHost(host);
  if (!stored) return null;
  return {
    hosts: [...stored.hosts],
    name: stored.name,
    writeKey: stored.writeKey,
  };
}

/**
 * Internal credential lookup. Import this only from a `server-only` module;
 * rendering code should use the sanitized `tenantForHost()` result above.
 */
export function storedTenantForHost(
  host: string | null | undefined,
): StoredTenantRecord | null {
  const store = unsafeTenantStore();
  if (!store) return null;
  const normalized = (host ?? "").toLowerCase();
  const exact = store.projects.find((project) =>
    project.hosts.includes(normalized),
  );
  if (exact) return exact;

  const wildcard = store.projects.find((project) =>
    project.hosts.includes("*"),
  );
  if (wildcard) return wildcard;

  // Local verification commonly runs development and production builds on
  // different ports. Reuse a loopback mapping only when the hostname selects
  // exactly one project; ambiguity must remain fail-closed.
  const hostname = hostnameFromHostHeader(normalized);
  if (!isLoopback(hostname)) return null;
  const loopbackMatches = store.projects.filter((project) =>
    project.hosts.some(
      (candidate) => hostnameFromHostHeader(candidate) === hostname,
    ),
  );
  return loopbackMatches.length === 1 ? loopbackMatches[0]! : null;
}

function hostnameFromHostHeader(host: string): string {
  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

/** The public write key for `host`. `null` means "no project" — nothing is tracked. */
export function writeKeyForHost(
  host: string | null | undefined,
): string | null {
  return tenantForHost(host)?.writeKey ?? null;
}

/** Forgets the parsed store. Used by tests that write a store mid-run. */
export function resetTenantCache(): void {
  cached = null;
}
