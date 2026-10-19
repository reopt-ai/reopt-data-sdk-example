import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

export const packages = [
  "@reopt-ai/data-contract",
  "@reopt-ai/data-sdk-client",
  "@reopt-ai/data-sdk-devtool",
  "@reopt-ai/data-sdk-server",
  "@reopt-ai/data-cli",
];
export const marker = "# BEGIN sdk:local — managed by scripts/sdk-mode.mjs";
export const markerEnd = "# END sdk:local";

export function stripManagedBlock(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === marker);
  if (start === -1) return text;
  const end = lines.findIndex(
    (line, index) => index > start && line.trim() === markerEnd,
  );
  if (
    end === -1 ||
    lines.filter((line) => line.trim() === marker).length !== 1 ||
    lines.filter((line) => line.trim() === markerEnd).length !== 1
  )
    throw new Error(
      "SDK workspace override markers are incomplete or duplicated",
    );
  return [...lines.slice(0, start), ...lines.slice(end + 1)].join("\n");
}

export function managedReferences(root) {
  const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  if (!workspace.includes(marker)) return new Map();
  stripManagedBlock(workspace);
  const block = workspace.slice(
    workspace.indexOf(marker) + marker.length,
    workspace.indexOf(markerEnd),
  );
  const refs = new Map();
  for (const line of block.split("\n").filter((line) => line.trim())) {
    const match =
      /^\s*"(@reopt-ai\/data-[\w-]+)": ((?:link|file):\S+)\s*$/.exec(line);
    if (!match || !packages.includes(match[1]) || refs.has(match[1]))
      throw new Error("Unrecognized managed SDK override");
    const [kind, ...path] = match[2].split(":");
    const target = resolve(root, path.join(":"));
    const expected =
      kind === "link"
        ? resolve(
            root,
            process.env.REOPT_DATA_PATH ?? "../reopt-data",
            "packages",
            match[1].replace("@reopt-ai/", ""),
          )
        : resolve(root, ".sdk-local", "packages");
    if (
      kind === "link"
        ? target !== expected
        : !target.startsWith(expected + "/") || !target.endsWith(".tgz")
    )
      throw new Error("SDK override is outside its managed package location");
    refs.set(match[1], match[2]);
  }
  if (refs.size !== packages.length)
    throw new Error(
      "Managed SDK overrides must include the complete package suite",
    );
  return refs;
}

export function sdkMode(root) {
  const refs = [...managedReferences(root).values()];
  if (!refs.length) return "npm";
  if (refs.every((ref) => ref.startsWith("link:"))) return "local";
  if (refs.every((ref) => ref.startsWith("file:"))) return "tarball";
  throw new Error("Mixed SDK modes are not supported");
}

const snapshotPath = (root) => join(root, ".sdk-local", "npm-state.json");
const manifestHash = (root) =>
  createHash("sha256")
    .update(readFileSync(join(root, "package.json")))
    .digest("hex");

export function saveNpmState(root) {
  if (existsSync(snapshotPath(root))) return;
  if (sdkMode(root) !== "npm")
    throw new Error(
      "No npm snapshot exists for this local setup; restore the intended npm lockfile first",
    );
  mkdirSync(join(root, ".sdk-local"), { recursive: true });
  writeFileSync(
    snapshotPath(root),
    JSON.stringify({
      manifestHash: manifestHash(root),
      workspace: readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"),
      lockfile: readFileSync(join(root, "pnpm-lock.yaml"), "utf8"),
    }),
    { flag: "wx", mode: 0o600 },
  );
}

export function restoreNpmState(root) {
  if (!existsSync(snapshotPath(root))) {
    if (sdkMode(root) !== "npm")
      throw new Error(
        "Missing npm snapshot; restore the intended npm lockfile before switching modes",
      );
    return;
  }
  const saved = JSON.parse(readFileSync(snapshotPath(root), "utf8"));
  if (
    saved.manifestHash !== manifestHash(root) ||
    saved.workspace !==
      stripManagedBlock(readFileSync(join(root, "pnpm-workspace.yaml"), "utf8"))
  )
    throw new Error(
      "Package configuration changed during SDK development; reconcile it with .sdk-local/npm-state.json before restoring",
    );
  writeFileSync(join(root, "pnpm-workspace.yaml"), saved.workspace);
  writeFileSync(join(root, "pnpm-lock.yaml"), saved.lockfile);
}

export function finishNpmRestore(root) {
  rmSync(snapshotPath(root), { force: true });
}

export function managedLocalFile(root, file, content) {
  if (file !== "pnpm-lock.yaml" && file !== "pnpm-workspace.yaml") return false;
  const allowed = new Set(managedReferences(root).values());
  if (!allowed.size) return false;
  const references = content.match(/\b(?:link|file):[^\s'"(),}]+/g) ?? [];
  return references.every((reference) => allowed.has(reference));
}
