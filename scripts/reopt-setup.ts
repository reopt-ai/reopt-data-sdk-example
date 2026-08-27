/**
 * Idempotently provisions the local reopt-data resources this example needs.
 *
 *   pnpm reopt:setup             # create once, then reuse
 *   pnpm reopt:setup -- --status # inspect without changing resources
 *   pnpm reopt:setup -- --rotate # rotate the server secret
 *   pnpm reopt:setup -- --reset  # clear this project's captured data
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (
  process.env.REOPT_DATA_BASE_URL ?? "http://localhost:4001"
).replace(/\/+$/, "");
const EMAIL = process.env.REOPT_DATA_SETUP_EMAIL ?? "shop-example@reopt.local";
const ORG_NAME = process.env.REOPT_DATA_SETUP_ORG ?? "reopt shop example";
const PROJECT_NAME = process.env.REOPT_DATA_SETUP_PROJECT ?? "reopt-shop";
const CLIENT_NAME = `${PROJECT_NAME} · local`;
const HOSTS = (
  process.env.REOPT_DATA_SETUP_HOSTS ?? "localhost:4100,127.0.0.1:4100"
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
const OUTPUT = join(process.cwd(), ".reopt-local.json");
const flags = new Set(process.argv.slice(2));

interface Named {
  id: string;
  name: string;
}

interface ClientRecord extends Named {
  projectId: string;
  writeKey: string;
  scopes: string[];
  serverSecret?: string;
}

interface LocalProject {
  hosts: string[];
  name: string;
  projectId: string;
  writeKey: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

interface LocalStore {
  baseUrl: string;
  projects: LocalProject[];
}

let sessionCookie = "";

function readLocalStore(): LocalStore | null {
  if (!existsSync(OUTPUT)) return null;
  try {
    return JSON.parse(readFileSync(OUTPUT, "utf8")) as LocalStore;
  } catch {
    return null;
  }
}

async function trpc<T>(
  path: string,
  input?: unknown,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const url =
    method === "GET"
      ? `${BASE}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
      : `${BASE}/api/trpc/${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(sessionCookie ? { cookie: sessionCookie } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ json: input }) } : {}),
  });
  const body = (await response.json()) as {
    result?: { data?: { json?: T } };
    error?: { message?: string };
  };
  if (!response.ok || body.error) {
    throw new Error(
      `${path} failed (${response.status}): ${body.error?.message ?? "unknown error"}`,
    );
  }
  return body.result?.data?.json as T;
}

async function signIn(): Promise<void> {
  const url = `${BASE}/api/reopt-auth/e2e/complete?token=reopt-auth-e2e&email=${encodeURIComponent(EMAIL)}&name=Shop%20Example`;
  const response = await fetch(url, { redirect: "manual" });
  const cookie = response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .find((entry) => entry?.startsWith("reopt_session="));
  if (!cookie) {
    throw new Error(
      `Sign-in failed (${response.status}). Confirm reopt-data development is running at ${BASE}.`,
    );
  }
  sessionCookie = cookie;
}

async function findOrCreate<T extends Named>(
  listPath: string,
  listInput: unknown,
  createPath: string,
  createInput: { name: string } & Record<string, unknown>,
): Promise<T> {
  const existing = await trpc<T[]>(listPath, listInput, "GET");
  return (
    existing.find((entry) => entry.name === createInput.name) ??
    trpc<T>(createPath, createInput)
  );
}

async function showStatus(store: LocalStore | null): Promise<void> {
  if (!store?.projects[0]) {
    console.log(
      "[setup] status: not configured (.reopt-local.json is absent or invalid)",
    );
    return;
  }
  const local = store.projects[0];
  const clients = await trpc<ClientRecord[]>(
    "apiClient.list",
    { projectId: local.projectId },
    "GET",
  );
  const remote = clients.find((client) => client.id === local.clientId);
  console.log(`[setup] status: ${remote ? "ready" : "stale"}`);
  console.log(`[setup] reopt-data: ${store.baseUrl}`);
  console.log(`[setup] project: ${local.name} (${local.projectId})`);
  console.log(`[setup] API client: ${local.clientId}`);
  console.log(
    `[setup] scopes: ${(remote?.scopes ?? local.scopes ?? []).join(", ") || "unknown"}`,
  );
  console.log(`[setup] hosts: ${local.hosts.join(", ")}`);
}

async function main(): Promise<void> {
  console.log(`[setup] reopt-data: ${BASE}`);
  await signIn();
  console.log(`[setup] signed in: ${EMAIL}`);

  const existingStore = readLocalStore();
  if (flags.has("--status")) {
    await showStatus(existingStore);
    return;
  }

  const organization = await findOrCreate<Named>(
    "organization.list",
    undefined,
    "organization.create",
    {
      name: ORG_NAME,
    },
  );
  console.log(
    `[setup] organization: ${organization.name} (${organization.id})`,
  );

  const project = await findOrCreate<Named>(
    "project.list",
    { organizationId: organization.id },
    "project.create",
    { organizationId: organization.id, name: PROJECT_NAME },
  );
  console.log(`[setup] project: ${project.name} (${project.id})`);

  if (flags.has("--reset")) {
    await trpc("seed.clear", { projectId: project.id });
    console.log("[setup] project data reset");
  }

  const clients = await trpc<ClientRecord[]>(
    "apiClient.list",
    { projectId: project.id },
    "GET",
  );
  const stored = existingStore?.projects.find(
    (entry) => entry.projectId === project.id,
  );
  let client = stored
    ? clients.find((entry) => entry.id === stored.clientId)
    : undefined;
  let clientSecret = stored?.clientSecret;

  if (!client) client = clients.find((entry) => entry.name === CLIENT_NAME);
  if (!client) {
    client = await trpc<ClientRecord>("apiClient.create", {
      projectId: project.id,
      name: CLIENT_NAME,
      scopes: ["ingest", "query"],
    });
    clientSecret = client.serverSecret;
    console.log(`[setup] API client created: ${client.id}`);
  } else if (!clientSecret || flags.has("--rotate")) {
    client = await trpc<ClientRecord>("apiClient.regenerateSecret", {
      clientId: client.id,
    });
    clientSecret = client.serverSecret;
    console.log(`[setup] API client secret rotated: ${client.id}`);
  } else {
    console.log(`[setup] API client reused: ${client.id}`);
  }

  if (!client.scopes.includes("ingest") || !client.scopes.includes("query")) {
    client = await trpc<ClientRecord>("apiClient.setScopes", {
      clientId: client.id,
      scopes: ["ingest", "query"],
    });
    console.log("[setup] API client scopes updated: ingest, query");
  }
  if (!clientSecret) throw new Error("API client secret was not returned");

  for (const stale of clients.filter(
    (entry) =>
      entry.id !== client.id && entry.name.startsWith(`${PROJECT_NAME} · `),
  )) {
    await trpc("apiClient.delete", { clientId: stale.id });
    console.log(`[setup] stale local API client removed: ${stale.id}`);
  }

  const nextStore: LocalStore = {
    baseUrl: BASE,
    projects: [
      {
        hosts: HOSTS,
        name: PROJECT_NAME,
        projectId: project.id,
        writeKey: client.writeKey,
        clientId: client.id,
        clientSecret,
        scopes: client.scopes,
      },
    ],
  };
  writeFileSync(OUTPUT, `${JSON.stringify(nextStore, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(`[setup] credentials updated → ${OUTPUT}`);
  console.log(`[setup] hosts: ${HOSTS.join(", ")}`);
  console.log("[setup] start the integrated stack with `pnpm dev:stack`.");
}

main().catch((error: unknown) => {
  console.error(
    `[setup] ${error instanceof Error ? error.message : String(error)}`,
  );
  console.error(
    "[setup] The app still runs without reopt-data because the SDK fails open.",
  );
  process.exit(1);
});
