import "server-only";

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/** Where a package was installed from; mirrors `pnpm sdk:mode`. */
export type SdkPackageSource = "npm" | "local" | "tarball" | "unknown";

export interface SdkPackageVersion {
  name: string;
  version: string;
  source: SdkPackageSource;
}

/** Published SDK package versions loaded by this deployment. */
let cached: SdkPackageVersion[] | null = null;

const PACKAGES = [
  "@reopt-ai/data-sdk-client",
  "@reopt-ai/data-sdk-server",
  "@reopt-ai/data-sdk-devtool",
  "@reopt-ai/data-contract",
];

export function sdkVersionSummary(): SdkPackageVersion[] {
  cached ??= resolveVersions();
  return cached;
}

function resolveVersions(): SdkPackageVersion[] {
  const require = createRequire(join(process.cwd(), "noop.js"));
  return PACKAGES.map((name) => {
    try {
      const directory = manifestDirOf(require.resolve(name));
      const manifest = JSON.parse(
        readFileSync(join(directory, "package.json"), "utf8"),
      ) as { version?: string };
      return {
        name,
        version: manifest.version ?? "?",
        source: sourceOf(directory),
      };
    } catch {
      return { name, version: "?", source: "unknown" };
    }
  });
}

function manifestDirOf(entry: string): string {
  let directory = dirname(entry);
  while (!existsSync(join(directory, "package.json"))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`no package.json above ${entry}`);
    directory = parent;
  }
  return directory;
}

/**
 * `sdk:local` links the sibling checkout, so the real path leaves
 * `node_modules`; `sdk:tarball` installs `file:` packages, which pnpm stores
 * under a `@file+` directory name.
 */
function sourceOf(directory: string): SdkPackageSource {
  const real = realpathSync(directory);
  if (!real.includes("/node_modules/")) return "local";
  if (real.includes("@file+")) return "tarball";
  return "npm";
}

/** One label for the whole suite; `mixed` is never a supported handoff state. */
export function sdkSourceLabel(versions: SdkPackageVersion[]): string {
  const sources = new Set(versions.map((entry) => entry.source));
  return sources.size === 1 ? [...sources][0]! : "mixed";
}
