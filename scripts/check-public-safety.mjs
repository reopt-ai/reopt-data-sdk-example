#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const staged = process.argv.includes("--staged");
const files = git(
  staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
    : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
)
  .split("\0")
  .filter(Boolean);

const forbiddenPaths = [
  /^\.env$/,
  /^\.env\..*\.local$/,
  /^\.reopt-local\.json$/,
  /^\.sdk-local(?:\/|$)/,
  /(?:^|\/)(?:id_rsa|id_ed25519|.*\.private\.key)$/i,
];

const secretPatterns = [
  {
    name: "private key",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "populated secret environment variable",
    pattern:
      /^(?:REOPT_DATA_[A-Z0-9_]*SECRET|BETTER_AUTH_SECRET|AUTH_SECRET|DATABASE_URL|ENCRYPTION_KEY)[ \t]*=[ \t]*[^\s#]+/m,
  },
  {
    name: "GitHub token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  },
  {
    name: "npm token",
    pattern: /\bnpm_[A-Za-z0-9]{20,}\b/,
  },
  {
    name: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    name: "Google API key",
    pattern: /\bAIza[A-Za-z0-9_-]{35}\b/,
  },
  {
    name: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  },
  {
    name: "registry authentication token",
    pattern: /^\s*(?:\/\/.*:)?_authToken\s*=\s*[^\s#]+/m,
  },
  {
    name: "private AI session link",
    pattern: /^[A-Za-z]+-Session:\s*https?:\/\/\S+\/(?:code\/)?session_/im,
  },
];

const failures = [];

for (const file of files) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    failures.push(`${file}: sensitive local path must not be committed`);
    continue;
  }

  let content;
  try {
    content = staged ? git(["show", `:${file}`]) : readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\0")) continue;

  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(content)) failures.push(`${file}: detected ${name}`);
  }
}

if (failures.length > 0) {
  console.error("Public-safety check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Remove the value from Git and rotate it if it was real.");
  process.exit(1);
}

console.log(`Public-safety check passed (${files.length} tracked files).`);

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}
