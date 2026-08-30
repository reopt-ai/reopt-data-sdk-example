#!/usr/bin/env node
/**
 * postbuild: upload this build's source maps with the reopt-data CLI.
 *
 * The build directory and public URL prefix come from `reopt-data.config.mjs`
 * (`sourcemaps.dir`, `sourcemaps.urlPrefix`); `REOPT_DATA_ASSET_PREFIX`
 * overrides the prefix for a deployment whose origin differs from the config.
 * Without a key this is a dry run, so a fresh clone still builds.
 */
import { spawnSync } from "node:child_process";

const env = process.env;
const hasCredentials = Boolean(
  env.REOPT_DATA_ORG_KEY ||
  env.REOPT_DATA_API_KEY ||
  env.REOPT_DATA_PLATFORM_KEY,
);
const deleteMaps = env.REOPT_DATA_DELETE_MAPS === "1";

const args = ["sourcemap", "upload"];
if (env.REOPT_DATA_ASSET_PREFIX)
  args.push("--url-prefix", env.REOPT_DATA_ASSET_PREFIX);
if (env.VERCEL_GIT_COMMIT_SHA)
  args.push("--release", env.VERCEL_GIT_COMMIT_SHA);

if (!hasCredentials) {
  args.push("--dry-run");
  if (deleteMaps) {
    process.stderr.write(
      "postbuild: REOPT_DATA_DELETE_MAPS is set but there are no credentials, so this is a dry run and nothing will be deleted.\n",
    );
  }
} else if (deleteMaps) {
  args.push("--delete-after-upload");
}

const result = spawnSync("reopt-data", args, { stdio: "inherit", env });
process.exit(result.status ?? 1);
