/**
 * Where the reopt SDK packages actually resolved from.
 *
 * Read from the filesystem rather than an env var so it reports what is loaded
 * and cannot drift from it. Kept free of `server-only` because `next.config.ts`
 * needs it too — see `sdk-mode.ts` for the guarded version the UI uses.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";

export interface SdkPackageMode {
  name: string;
  version: string;
  /** True when it resolved outside this app's `node_modules` — a linked checkout. */
  local: boolean;
  /** Where it resolved from, relative to the app root, when it is local. */
  path: string | null;
}

const PACKAGES = [
  "@reopt-ai/data-sdk-client",
  "@reopt-ai/data-sdk-server",
  "@reopt-ai/data-contract",
];

export function resolveSdkPackages(
  root: string = process.cwd(),
): SdkPackageMode[] {
  const require = createRequire(join(root, "noop.js"));
  const nodeModules = realpathSync(join(root, "node_modules"));

  return PACKAGES.map((name) => {
    try {
      // Not `require.resolve("<name>/package.json")`: the manifest is not in
      // these packages' `exports` map, so that throws.
      const directory = manifestDirOf(realpathSync(require.resolve(name)));
      const version = (
        JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as {
          version: string;
        }
      ).version;
      const local = !directory.startsWith(nodeModules);
      return {
        name,
        version,
        local,
        path: local ? relative(root, directory) : null,
      };
    } catch {
      return { name, version: "?", local: false, path: null };
    }
  });
}

/** True when any SDK package is being consumed from a local checkout. */
export function isSdkLinkedLocally(root?: string): boolean {
  return resolveSdkPackages(root).some((entry) => entry.local);
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
