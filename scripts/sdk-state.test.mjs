import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  packages,
  marker,
  markerEnd,
  saveNpmState,
  restoreNpmState,
  finishNpmRestore,
  managedLocalFile,
} from "./sdk-state.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "sdk-mode-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "package.json"), '{"name":"fixture"}\n');
  writeFileSync(
    join(root, "pnpm-workspace.yaml"),
    'overrides:\n  existing: "1.0.0"\n',
  );
  writeFileSync(join(root, "pnpm-lock.yaml"), "original transitive versions\n");
  writeFileSync(join(root, ".gitignore"), ".sdk-local\n");
  const linked = `overrides:\n  ${marker}\n${packages.map((name) => `  "${name}": link:../reopt-data/packages/${name.replace("@reopt-ai/", "")}`).join("\n")}\n  ${markerEnd}\n  existing: "1.0.0"\n`;
  return { root, linked };
}

test("local and tarball work preserve the exact pre-existing npm lockfile", (t) => {
  const { root, linked } = fixture(t);
  saveNpmState(root);
  writeFileSync(join(root, "pnpm-workspace.yaml"), linked);
  writeFileSync(join(root, "pnpm-lock.yaml"), "local dependency graph\n");
  saveNpmState(root); // another mode switch must not replace the npm snapshot
  restoreNpmState(root);
  assert.equal(
    readFileSync(join(root, "pnpm-lock.yaml"), "utf8"),
    "original transitive versions\n",
  );
  assert.equal(
    readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"),
    'overrides:\n  existing: "1.0.0"\n',
  );
  finishNpmRestore(root);
});

test("restoration refuses to overwrite package edits made during local development", (t) => {
  const { root, linked } = fixture(t);
  saveNpmState(root);
  writeFileSync(join(root, "pnpm-workspace.yaml"), linked);
  writeFileSync(join(root, "package.json"), '{"name":"edited"}\n');
  assert.throws(() => restoreNpmState(root), /configuration changed/);
  assert.equal(
    readFileSync(join(root, "package.json"), "utf8"),
    '{"name":"edited"}\n',
  );
});

test("development safety accepts only managed references and still blocks secrets and release links", (t) => {
  const { root, linked } = fixture(t);
  writeFileSync(join(root, "pnpm-workspace.yaml"), linked);
  assert.equal(managedLocalFile(root, "pnpm-workspace.yaml", linked), true);
  assert.equal(
    managedLocalFile(root, "pnpm-lock.yaml", "version: link:../unmanaged"),
    false,
  );
  assert.equal(managedLocalFile(root, "package.json", linked), false);
  spawnSync("git", ["init", "--quiet"], { cwd: root });
  const script = fileURLToPath(
    new URL("./check-public-safety.mjs", import.meta.url),
  );
  const run = (args) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
    });
  assert.equal(run(["--development"]).status, 0);
  assert.equal(run([]).status, 1);
  assert.notEqual(run(["--development", "--staged"]).status, 0);
  writeFileSync(join(root, "leaked.txt"), "ghp_" + "a".repeat(32));
  assert.equal(run(["--development"]).status, 1);
});
