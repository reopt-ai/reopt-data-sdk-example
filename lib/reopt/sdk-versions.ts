import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export interface SdkPackageVersion {
  name: string;
  version: string;
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
      return { name, version: manifest.version ?? "?" };
    } catch {
      return { name, version: "?" };
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
