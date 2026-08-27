#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "quick";
const commands =
  mode === "full"
    ? [["check"], ["e2e"], ["e2e:production"]]
    : mode === "quick"
      ? [["check"]]
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

console.log(`[verify] ${mode} verification passed`);
