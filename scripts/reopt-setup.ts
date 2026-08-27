/**
 * Mints the credentials this app needs from a running reopt-data instance and
 * writes them to `.reopt-local.json` (gitignored).
 *
 *   pnpm reopt:setup                      # http://localhost:4001
 *   REOPT_DATA_BASE_URL=… pnpm reopt:setup
 *
 * Why a file and not env vars: the write key is resolved *per host* here, the
 * way a multi-brand storefront has to resolve it. The file is that store. It
 * also keeps the server secret out of `.env`, where a `NEXT_PUBLIC_` typo is
 * one character away from shipping it to the browser.
 *
 * The dev-only sign-in route this uses exists only when reopt-data runs outside
 * production and on localhost.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (
  process.env.REOPT_DATA_BASE_URL ?? "http://localhost:4001"
).replace(/\/+$/, "");
const EMAIL = process.env.REOPT_DATA_SETUP_EMAIL ?? "shop-example@reopt.local";
const ORG_NAME = process.env.REOPT_DATA_SETUP_ORG ?? "reopt shop example";
const PROJECT_NAME = process.env.REOPT_DATA_SETUP_PROJECT ?? "reopt-shop";
const HOSTS = (
  process.env.REOPT_DATA_SETUP_HOSTS ?? "localhost:4100,127.0.0.1:4100"
)
  .split(",")
  .map((h) => h.trim());

const OUTPUT = join(process.cwd(), ".reopt-local.json");

let sessionCookie = "";

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
      `Sign-in failed (${response.status}). Confirm that reopt-data is running in development mode at ${BASE}.`,
    );
  }
  sessionCookie = cookie;
}

interface Named {
  id: string;
  name: string;
}

async function findOrCreate<T extends Named>(
  listPath: string,
  listInput: unknown,
  createPath: string,
  createInput: { name: string } & Record<string, unknown>,
): Promise<T> {
  const existing = await trpc<T[]>(listPath, listInput, "GET");
  const match = existing?.find((entry) => entry.name === createInput.name);
  if (match) return match;
  return trpc<T>(createPath, createInput);
}

async function main(): Promise<void> {
  console.log(`[setup] reopt-data: ${BASE}`);
  await signIn();
  console.log(`[setup] signed in: ${EMAIL}`);

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

  // The server secret is shown once, at creation, so an existing client of the
  // same name cannot be reused — a new one is minted each run.
  const client = await trpc<{
    id: string;
    writeKey: string;
    serverSecret: string;
  }>("apiClient.create", {
    projectId: project.id,
    name: `${PROJECT_NAME} · ${new Date().toISOString().slice(0, 19)}`,
  });
  console.log(`[setup] API client: ${client.id}`);

  writeFileSync(
    OUTPUT,
    `${JSON.stringify(
      {
        baseUrl: BASE,
        projects: [
          {
            hosts: HOSTS,
            name: PROJECT_NAME,
            writeKey: client.writeKey,
            clientId: client.id,
            clientSecret: client.serverSecret,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  console.log(`[setup] wrote credentials → ${OUTPUT}`);
  console.log(`[setup] hosts: ${HOSTS.join(", ")}`);
  console.log("[setup] start the application with `pnpm dev`.");
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
