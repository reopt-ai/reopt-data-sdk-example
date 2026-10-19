#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const mode = process.argv[2] ?? "quick";
const commands = ["quick", "full"].includes(mode)
  ? [
      ["format:check"],
      ["lint"],
      ["typecheck"],
      ["test"],
      ["feature-map:check"],
      ["public:safety", "--development"],
    ]
  : null;

if (!commands) {
  console.error("usage: node scripts/verify-feature.mjs <quick|full>");
  process.exit(2);
}

for (const args of commands) {
  console.log(`[verify] pnpm ${args.join(" ")}`);
  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (mode === "full") {
  const dataRoot = resolve(process.env.REOPT_DATA_PATH ?? "../reopt-data");
  const runner = resolve(dataRoot, "scripts/e2e/run.mjs");
  if (!existsSync(runner))
    throw new Error(
      "Full verification needs the sibling reopt-data checkout and Docker; use pnpm e2e for standalone browser contracts",
    );
  const result = spawnSync(process.execPath, [runner, "--example"], {
    cwd: dataRoot,
    stdio: "inherit",
    env: { ...process.env, REOPT_SDK_EXAMPLE_PATH: process.cwd() },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`[verify] ${mode} verification passed`);
