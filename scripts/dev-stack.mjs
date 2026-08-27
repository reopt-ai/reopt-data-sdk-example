#!/usr/bin/env node
/** Run the sibling SDK build loop, reopt-data, and the reference app together. */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = resolve(
  exampleRoot,
  process.env.REOPT_DATA_PATH ?? "../reopt-data",
);
const children = new Set();
let shuttingDown = false;

function localEnvironment() {
  const path = resolve(exampleRoot, ".reopt-local.json");
  if (!existsSync(path)) return {};
  const local = JSON.parse(readFileSync(path, "utf8"));
  const project = Array.isArray(local.projects) ? local.projects[0] : null;
  if (!project) return {};
  return {
    ...(local.baseUrl ? { REOPT_DATA_BASE_URL: String(local.baseUrl) } : {}),
    ...(project.writeKey
      ? { REOPT_DATA_WRITE_KEY: String(project.writeKey) }
      : {}),
    ...(project.projectId
      ? { REOPT_DATA_PROJECT_ID: String(project.projectId) }
      : {}),
    ...(project.clientId
      ? { REOPT_DATA_CLIENT_ID: String(project.clientId) }
      : {}),
    ...(project.clientSecret
      ? { REOPT_DATA_CLIENT_SECRET: String(project.clientSecret) }
      : {}),
  };
}

const stackEnv = {
  ...process.env,
  ...localEnvironment(),
  REOPT_DATA_LOCAL_LINKS: "true",
  REOPT_DATA_EXAMPLE_DIAGNOSTICS:
    process.env.REOPT_DATA_EXAMPLE_DIAGNOSTICS ?? "true",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:4100",
  MOTHERDUCK_LOCAL_PATH:
    process.env.MOTHERDUCK_LOCAL_PATH ??
    resolve(dataRoot, "docker/data/analytics.duckdb"),
};

function start(label, command, args, cwd) {
  console.log(`[dev-stack] starting ${label}`);
  const child = spawn(command, args, { cwd, stdio: "inherit", env: stackEnv });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(
        `[dev-stack] ${label} stopped (${signal ?? code ?? "unknown"})`,
      );
      shutdown(code ?? 1);
    }
  });
  return child;
}

function run(label, command, args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = start(label, command, args, cwd);
    child.once("exit", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${label} failed`)),
    );
  });
}

async function responds(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return true;
    if (url.endsWith("/api/health")) {
      const body = await response.json();
      return (
        body?.checks?.postgresql?.status === "ok" &&
        body?.checks?.analytics?.status === "ok"
      );
    }
    return false;
  } catch {
    return false;
  }
}

async function waitFor(url, label) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await responds(url)) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
    process.exit(code);
  }, 5_000).unref();
  if (children.size === 0) process.exit(code);
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

async function main() {
  if (!existsSync(resolve(dataRoot, "package.json")))
    throw new Error(`reopt-data not found at ${dataRoot}`);
  await run("local SDK linking", "pnpm", ["sdk:local"], exampleRoot);
  const filters = [
    "--filter=@reopt-ai/data-contract",
    "--filter=@reopt-ai/data-sdk-client",
    "--filter=@reopt-ai/data-sdk-devtool",
    "--filter=@reopt-ai/data-sdk-server",
  ];
  await run(
    "initial SDK build",
    "pnpm",
    ["exec", "turbo", "run", "build", ...filters],
    dataRoot,
  );
  start(
    "SDK source watcher",
    "node",
    [resolve(exampleRoot, "scripts/sdk-watch.mjs")],
    exampleRoot,
  );

  const dataUrl = stackEnv.REOPT_DATA_BASE_URL ?? "http://localhost:4001";
  if (await responds(`${dataUrl}/api/health`))
    console.log(`[dev-stack] reusing reopt-data at ${dataUrl}`);
  else {
    start("reopt-data", "pnpm", ["dev:min"], dataRoot);
    await waitFor(`${dataUrl}/api/health`, "reopt-data");
  }

  if (await responds("http://localhost:4100"))
    console.log("[dev-stack] reusing example at http://localhost:4100");
  else {
    start("SDK example", "pnpm", ["dev"], exampleRoot);
    await waitFor("http://localhost:4100", "SDK example");
  }
  console.log(`[dev-stack] ready: http://localhost:4100 ↔ ${dataUrl}`);
}

main().catch((error) => {
  console.error(
    `[dev-stack] ${error instanceof Error ? error.message : String(error)}`,
  );
  shutdown(1);
});
