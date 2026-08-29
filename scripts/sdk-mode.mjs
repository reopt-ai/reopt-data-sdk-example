#!/usr/bin/env node
/** Switch the example between published, linked, and packed Data SDK packages. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceFile = join(root, "pnpm-workspace.yaml");
const tarballDir = join(root, ".sdk-local", "packages");
const packages = [
  "@reopt-ai/data-contract",
  "@reopt-ai/data-sdk-client",
  "@reopt-ai/data-sdk-devtool",
  "@reopt-ai/data-sdk-server",
];
const monorepo = resolve(root, process.env.REOPT_DATA_PATH ?? "../reopt-data");
const marker = "# BEGIN sdk:local — managed by scripts/sdk-mode.mjs";
const markerEnd = "# END sdk:local";

function packageDir(name) {
  return join(monorepo, "packages", name.replace("@reopt-ai/", ""));
}

function requireLocalPackages() {
  const missing = packages.filter(
    (name) => !existsSync(join(packageDir(name), "package.json")),
  );
  if (missing.length === 0) return;
  console.error(`[sdk-mode] missing under ${monorepo}: ${missing.join(", ")}`);
  process.exit(1);
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/**
 * Remove the managed block, marker lines and all.
 *
 * Whole lines, not `indexOf(marker)`. Prettier indents a comment that sits
 * inside a YAML mapping, so after one format the markers are no longer at
 * column 0 — and slicing at the `#` left those two spaces behind, glued to the
 * next entry. Two spaces per round, until `pnpm install` refused the file with
 * "bad indentation of a mapping entry".
 */
function stripManagedBlock(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === marker);
  if (start === -1) return text;
  const end = lines.findIndex(
    (line, index) => index >= start && line.trim() === markerEnd,
  );
  if (end === -1) throw new Error("sdk:local workspace block is incomplete");
  return [...lines.slice(0, start), ...lines.slice(end + 1)].join("\n");
}

function writeOverrides(lines) {
  const clean = stripManagedBlock(readFileSync(workspaceFile, "utf8"));
  // Markers indented to match the mapping they live in, so the formatter has
  // nothing to move and the next strip finds them where it left them.
  const next = clean.replace(
    /^overrides:$/m,
    `overrides:\n  ${marker}\n${lines.join("\n")}\n  ${markerEnd}`,
  );
  writeFileSync(workspaceFile, next);
}

function install() {
  run("pnpm", ["install"]);
}

function setLocal() {
  requireLocalPackages();
  writeOverrides(
    packages.map(
      (name) => `  "${name}": link:${relative(root, packageDir(name))}`,
    ),
  );
  install();
  status();
}

function setTarball() {
  requireLocalPackages();
  rmSync(tarballDir, { recursive: true, force: true });
  mkdirSync(tarballDir, { recursive: true });
  const overrides = [];
  for (const name of packages) {
    const directory = packageDir(name);
    console.log(`[sdk-mode] building and packing ${name}`);
    run("pnpm", ["run", "build"], directory);
    run("pnpm", ["pack", "--pack-destination", tarballDir], directory);
    const prefix = `${name.replace("@", "").replace("/", "-")}-`;
    const archive = readdirSync(tarballDir).find(
      (file) => file.startsWith(prefix) && file.endsWith(".tgz"),
    );
    if (!archive) throw new Error(`no archive produced for ${name}`);
    const digest = createHash("sha256")
      .update(readFileSync(join(tarballDir, archive)))
      .digest("hex")
      .slice(0, 8);
    const stamped = archive.replace(/\.tgz$/, `-${digest}.tgz`);
    renameSync(join(tarballDir, archive), join(tarballDir, stamped));
    overrides.push(
      `  "${name}": file:${relative(root, join(tarballDir, stamped))}`,
    );
  }
  writeOverrides(overrides);
  install();
  status();
}

function setNpm() {
  writeFileSync(
    workspaceFile,
    stripManagedBlock(readFileSync(workspaceFile, "utf8")),
  );
  install();
  status();
}

function manifestDirectory(entry) {
  let directory = dirname(entry);
  while (!existsSync(join(directory, "package.json"))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`no package.json above ${entry}`);
    directory = parent;
  }
  return directory;
}

function status() {
  const require = createRequire(join(root, "noop.js"));
  const nodeModules = realpathSync(join(root, "node_modules"));
  for (const name of packages) {
    try {
      const directory = manifestDirectory(realpathSync(require.resolve(name)));
      const { version } = JSON.parse(
        readFileSync(join(directory, "package.json"), "utf8"),
      );
      const source = directory.startsWith(nodeModules)
        ? directory.includes("file+") || directory.includes(".tgz")
          ? "tarball"
          : "npm"
        : "local";
      console.log(
        `  ${name.padEnd(30)} ${source.padEnd(7)} ${String(version)}`,
      );
    } catch {
      console.log(`  ${name.padEnd(30)} not installed`);
    }
  }
}

const command = process.argv[2] ?? "status";
if (command === "local") setLocal();
else if (command === "tarball") setTarball();
else if (command === "npm") setNpm();
else if (command === "status") status();
else {
  console.error(
    `unknown command: ${command} (expected status | local | tarball | npm)`,
  );
  process.exit(1);
}
