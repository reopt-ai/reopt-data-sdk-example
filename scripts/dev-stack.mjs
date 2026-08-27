#!/usr/bin/env node
/** Runs the example, reopt-data, and the four linked SDK build watchers as one local stack. */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = resolve(
  exampleRoot,
  process.env.REOPT_DATA_PATH ?? "../reopt-data",
);
const workspaceFile = resolve(exampleRoot, "pnpm-workspace.yaml");
const args = new Set(process.argv.slice(2));
const children = new Set();
let shuttingDown = false;
let drainTimer;
const stackEnv = {
  ...process.env,
  MOTHERDUCK_LOCAL_PATH:
    process.env.MOTHERDUCK_LOCAL_PATH ??
    resolve(dataRoot, "docker/data/analytics.duckdb"),
};

if (!existsSync(resolve(dataRoot, "package.json"))) {
  console.error(`[dev-stack] reopt-data was not found at ${dataRoot}`);
  process.exit(1);
}

function start(label, command, commandArgs, cwd) {
  console.log(`[dev-stack] starting ${label}`);
  const child = spawn(command, commandArgs, {
    cwd,
    stdio: "inherit",
    env: stackEnv,
  });
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

function run(label, command, commandArgs, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = start(label, command, commandArgs, cwd);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${label} failed (${code ?? "unknown"})`));
    });
  });
}

async function responds(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1_500),
    });
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

async function waitFor(url, label, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await responds(url)) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (drainTimer) clearInterval(drainTimer);
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => {
    for (const child of children) child.kill("SIGKILL");
    process.exit(code);
  }, 5_000).unref();
  if (children.size === 0) process.exit(code);
}

function startLocalQueueDrainer(dataUrl) {
  let draining = false;
  const drain = async () => {
    if (draining || shuttingDown) return;
    draining = true;
    try {
      await fetch(`${dataUrl}/api/cron/process-ingest?limit=500`, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Readiness and roundtrip checks surface persistent failures. A transient
      // restart while Next.js recompiles should not stop the whole stack.
    } finally {
      draining = false;
    }
  };
  void drain();
  drainTimer = setInterval(() => void drain(), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  const workspace = readFileSync(workspaceFile, "utf8");
  if (!workspace.includes("# BEGIN sdk:local")) {
    await run("local SDK linking", "pnpm", ["sdk:local"], exampleRoot);
  }

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
    "SDK build watcher",
    "pnpm",
    ["exec", "turbo", "watch", "build", ...filters],
    dataRoot,
  );

  const dataUrl = process.env.REOPT_DATA_BASE_URL ?? "http://localhost:4001";
  if (await responds(`${dataUrl}/api/health`)) {
    console.log(`[dev-stack] reusing reopt-data at ${dataUrl}`);
  } else {
    start(
      "reopt-data",
      "pnpm",
      [args.has("--full") ? "dev:full" : "dev:min"],
      dataRoot,
    );
    await waitFor(`${dataUrl}/api/health`, "reopt-data");
  }
  if (!args.has("--full")) startLocalQueueDrainer(dataUrl);

  if (!args.has("--no-setup")) {
    const setupArgs = ["reopt:setup"];
    if (args.has("--reset")) setupArgs.push("--reset");
    if (args.has("--rotate")) setupArgs.push("--rotate");
    await run("local resource setup", "pnpm", setupArgs, exampleRoot);
  }

  if (await responds("http://localhost:4100")) {
    console.log(
      "[dev-stack] example is already running at http://localhost:4100",
    );
  } else {
    start("SDK example", "pnpm", ["dev"], exampleRoot);
    await waitFor("http://localhost:4100", "SDK example");
  }
  console.log(
    "[dev-stack] ready: http://localhost:4100 ↔ http://localhost:4001",
  );
}

main().catch((error) => {
  console.error(
    `[dev-stack] ${error instanceof Error ? error.message : String(error)}`,
  );
  shutdown(1);
});
