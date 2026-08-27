#!/usr/bin/env node
/** Rebuild linked SDK packages after source changes without watching dist. */
import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = resolve(
  exampleRoot,
  process.env.REOPT_DATA_PATH ?? "../reopt-data",
);
const packageNames = [
  "data-contract",
  "data-sdk-client",
  "data-sdk-devtool",
  "data-sdk-server",
];
const filters = packageNames.map((name) => `--filter=@reopt-ai/${name}`);
const watchers = [];
let debounce;
let building = false;
let queued = false;
let child;

function build() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  console.log("[sdk-watch] source changed; rebuilding linked packages");
  child = spawn("pnpm", ["exec", "turbo", "run", "build", ...filters], {
    cwd: dataRoot,
    env: process.env,
    stdio: "inherit",
  });
  child.once("exit", (code) => {
    building = false;
    child = undefined;
    if (code !== 0)
      console.error(
        `[sdk-watch] build failed (${code ?? "unknown"}); watching continues`,
      );
    if (queued) {
      queued = false;
      build();
    }
  });
}

function schedule() {
  clearTimeout(debounce);
  debounce = setTimeout(build, 180);
}

for (const name of packageNames) {
  const source = resolve(dataRoot, "packages", name, "src");
  if (!existsSync(source))
    throw new Error(`missing SDK source directory: ${source}`);
  watchers.push(watch(source, { recursive: true }, schedule));
}

function shutdown() {
  clearTimeout(debounce);
  for (const watcher of watchers) watcher.close();
  child?.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
console.log("[sdk-watch] watching SDK src directories");
