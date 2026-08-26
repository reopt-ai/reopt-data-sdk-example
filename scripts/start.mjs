#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { assertProductionRuntimeConfig } from "../lib/runtime-config.shared.mjs";

assertProductionRuntimeConfig(process.env);

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const args = process.argv.slice(2);
if (!args.includes("-p") && !args.includes("--port")) {
  args.push("-p", "4100");
}

const child = spawn(process.execPath, [nextBin, "start", ...args], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`[start] ${error.message}`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
