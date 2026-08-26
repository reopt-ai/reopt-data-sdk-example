#!/usr/bin/env node
/**
 * Switches which copy of the reopt-data SDK this app is built against.
 *
 *   node scripts/sdk-mode.mjs status   what is installed right now
 *   node scripts/sdk-mode.mjs local    ../reopt-data/packages/*, symlinked
 *   node scripts/sdk-mode.mjs tarball  the same packages, built and packed
 *   node scripts/sdk-mode.mjs npm      the published versions in package.json
 *
 * Why overrides and not `pnpm link`: a link installed as a *dependency* leaves
 * the lockfile and `package.json` claiming the published version, so a
 * contributor who pulls and installs silently gets a different SDK than the one
 * that was tested. An override in `pnpm-workspace.yaml` is one visible,
 * diffable line, and `sdk:npm` removes it completely.
 *
 * `local` and `tarball` run the same code and differ in fidelity:
 *
 * - `local` symlinks the package directories, so a rebuilt `dist` is picked up
 *   on the next load. That is the fast loop. Its cost: a linked package
 *   resolves its own peers from the reopt-data checkout, so `next` is loaded
 *   twice and `pnpm typecheck` reports a `NextRequest` type mismatch in
 *   `proxy.ts`. Build, runtime and the e2e suite are unaffected.
 * - `tarball` builds and packs each package, then installs the archive —
 *   exactly what npm would deliver, including the package manifest and files.
 *   Use it for the last check before publishing.
 *
 * In `local` mode the SDK is consumed through `dist/`, so keep a build running:
 *
 *   pnpm --filter @reopt-ai/data-sdk-client --filter @reopt-ai/data-sdk-server dev
 */
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

/** The packages that have a local counterpart in the reopt-data monorepo. */
const LINKABLE = [
  "@reopt-ai/data-contract",
  "@reopt-ai/data-sdk-client",
  "@reopt-ai/data-sdk-server",
];

/** Where the reopt-data checkout is expected, relative to this repo. */
const MONOREPO = process.env.REOPT_DATA_PATH ?? "../reopt-data";

const MARKER = "# BEGIN sdk:local — managed by scripts/sdk-mode.mjs";
const MARKER_END = "# END sdk:local";

function packageDirFor(name) {
  return join(root, MONOREPO, "packages", name.replace("@reopt-ai/", ""));
}

/** Fails loudly when the reopt-data checkout is not where it should be. */
function requirePackages() {
  const missing = LINKABLE.filter(
    (name) => !existsSync(join(packageDirFor(name), "package.json")),
  );
  if (missing.length === 0) return;

  console.error(
    `[sdk-mode] not found under ${MONOREPO}: ${missing.join(", ")}`,
  );
  console.error(
    "[sdk-mode] set REOPT_DATA_PATH to your reopt-data checkout, or run `pnpm sdk:npm`.",
  );
  process.exit(1);
}

function setLocal() {
  requirePackages();

  const unbuilt = LINKABLE.filter(
    (name) => !existsSync(join(packageDirFor(name), "dist")),
  );
  if (unbuilt.length > 0) {
    console.warn(`[sdk-mode] no dist/ yet in: ${unbuilt.join(", ")}`);
    console.warn(`[sdk-mode] build them first:  pnpm -C ${MONOREPO} build`);
  }

  writeOverrides(
    LINKABLE.map(
      (name) => `  "${name}": link:${relative(root, packageDirFor(name))}`,
    ),
  );
  install();
  status();
}

/**
 * Builds and packs each package, then installs the archives.
 *
 * The file name carries a hash of the archive because pnpm keys a `file:`
 * dependency by its path: repacking to the same name would reinstall the
 * previous contents while reporting success.
 */
function setTarball() {
  requirePackages();

  rmSync(tarballDir, { recursive: true, force: true });
  mkdirSync(tarballDir, { recursive: true });

  const overrides = [];
  for (const name of LINKABLE) {
    const directory = packageDirFor(name);
    console.log(`[sdk-mode] building and packing ${name}`);
    run("pnpm", ["-C", directory, "run", "build"]);
    run("pnpm", ["-C", directory, "pack", "--pack-destination", tarballDir]);

    const packed = readdirSync(tarballDir).find(
      (file) => file.endsWith(".tgz") && file.startsWith(tarballPrefix(name)),
    );
    if (!packed) {
      console.error(`[sdk-mode] pnpm pack produced no archive for ${name}`);
      process.exit(1);
    }

    const digest = createHash("sha256")
      .update(readFileSync(join(tarballDir, packed)))
      .digest("hex")
      .slice(0, 8);
    const stamped = packed.replace(/\.tgz$/, `-${digest}.tgz`);
    renameSync(join(tarballDir, packed), join(tarballDir, stamped));
    overrides.push(
      `  "${name}": file:${relative(root, join(tarballDir, stamped))}`,
    );
  }

  writeOverrides(overrides);
  install();
  status();
}

function setNpm() {
  writeFileSync(workspaceFile, stripBlock(readFileSync(workspaceFile, "utf8")));
  install();
  status();
}

/** Replaces the managed block inside `overrides:` with these lines. */
function writeOverrides(lines) {
  const text = stripBlock(readFileSync(workspaceFile, "utf8")).replace(
    /^overrides:$/m,
    `overrides:\n${MARKER}\n${lines.join("\n")}\n${MARKER_END}`,
  );
  writeFileSync(workspaceFile, text);
}

function stripBlock(text) {
  const start = text.indexOf(MARKER);
  if (start === -1) return text;
  const end = text.indexOf(MARKER_END, start);
  if (end === -1) return text;
  return text.slice(0, start) + text.slice(end + MARKER_END.length + 1);
}

/** `@reopt-ai/data-sdk-client` → `reopt-ai-data-sdk-client-`, the prefix pnpm packs under. */
function tarballPrefix(name) {
  return `${name.replace("@", "").replace("/", "-")}-`;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function install() {
  run("pnpm", ["install"]);
}

function status() {
  const require = createRequire(join(root, "noop.js"));
  const nodeModules = realpathSync(join(root, "node_modules"));

  for (const name of LINKABLE) {
    let directory;
    try {
      // Not `require.resolve("<name>/package.json")`: the manifest is not in
      // these packages' `exports` map, so that throws.
      directory = manifestDirOf(realpathSync(require.resolve(name)));
    } catch {
      console.log(`  ${name.padEnd(30)} not installed`);
      continue;
    }

    const { version } = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    );
    const source = directory.startsWith(nodeModules)
      ? sourceFromNodeModules(directory)
      : "local";
    console.log(
      `  ${name.padEnd(30)} ${source.padEnd(7)} ${String(version).padEnd(8)} ${
        source === "local" ? relative(root, directory) : ""
      }`,
    );
  }
}

/** A `file:` install still lands in `node_modules`; the store path says which it was. */
function sourceFromNodeModules(directory) {
  return directory.includes("file+") || directory.includes(".tgz")
    ? "tarball"
    : "npm";
}

/** Walks up from a resolved entry file to the directory holding its manifest. */
function manifestDirOf(entry) {
  let directory = dirname(entry);
  while (!existsSync(join(directory, "package.json"))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`no package.json above ${entry}`);
    directory = parent;
  }
  return directory;
}

const command = process.argv[2] ?? "status";
if (command === "local") setLocal();
else if (command === "tarball") setTarball();
else if (command === "npm") setNpm();
else if (command === "status") status();
else {
  console.error(
    `unknown command: ${command} (expected: status | local | tarball | npm)`,
  );
  process.exit(1);
}
