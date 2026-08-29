#!/usr/bin/env node
/**
 * `postbuild`'s source-map step, with the decisions it has to make.
 *
 * Three of them, and each has a wrong answer that fails quietly:
 *
 *  - **No credentials?** Dry run. A clone must still build, and a build that
 *    dies on a missing key is a clone nobody finishes setting up.
 *  - **Credentials?** Upload for real. Requiring a second opt-in would mean a
 *    configured deployment silently ships without maps.
 *  - **`REOPT_DATA_DELETE_MAPS=1`?** Delete what was stored — but only on a
 *    real upload. A dry run stores nothing, so asking it to delete would do
 *    nothing at all, and a toggle that silently does nothing is worse than no
 *    toggle.
 *
 * This lives in a script rather than in the npm script because the shell
 * version of the same logic is three nested `${VAR:+...}` expansions, and the
 * reason for each one does not fit in it.
 */
import { spawnSync } from "node:child_process";

const env = process.env;
// Either credential uploads: a project/organization key, or the platform key
// for the vendor's own build.
const hasCredentials = Boolean(
  env.REOPT_DATA_API_KEY || env.REOPT_DATA_PLATFORM_KEY,
);
const deleteMaps = env.REOPT_DATA_DELETE_MAPS === "1";

const prefix =
  env.REOPT_DATA_ASSET_PREFIX || "http://localhost:4100/_next/static";
const args = [
  "upload-sourcemaps",
  "--dir",
  ".next/static",
  "--url-prefix",
  prefix,
];

if (!hasCredentials) {
  args.push("--dry-run");
  if (deleteMaps) {
    // Said out loud rather than ignored: someone asked for deletion and is not
    // going to get it, and finding that out from a still-present .map file
    // after a deploy is the expensive way.
    process.stderr.write(
      "postbuild: REOPT_DATA_DELETE_MAPS is set but there are no credentials, so this is a dry run and nothing will be deleted.\n",
    );
  }
} else if (deleteMaps) {
  args.push("--delete-after-upload");
}

// Inherited, so the key never appears in an argument list a process listing
// would show.
const result = spawnSync("reopt-data", args, { stdio: "inherit", env });
process.exit(result.status ?? 1);
