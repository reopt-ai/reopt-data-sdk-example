#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const staged = process.argv.includes("--staged");
const history = process.argv.includes("--history") && !staged;
const files = git(
  staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
    : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
)
  .split("\0")
  .filter(Boolean);

const forbiddenPaths = [
  /(?:^|\/)\.reopt-example(?:\/|$)/,
  /(?:^|\/)\.reopt-local\.json$/,
  /(?:^|\/)\.sdk-local(?:\/|$)/,
  /(?:^|\/)(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/i,
  /\.(?:key|p12|pfx)$/i,
  /(?:^|\/).*\.private\.pem$/i,
];

const secretPatterns = [
  {
    name: "private key",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "populated secret environment variable",
    pattern:
      /^(?:REOPT_DATA_[A-Z0-9_]*SECRET|BETTER_AUTH_SECRET|AUTH_SECRET|DATABASE_URL|ENCRYPTION_KEY|[A-Z0-9_]*(?:ACCESS_TOKEN|API_TOKEN|PRIVATE_KEY))[ \t]*=[ \t]*[^\s#][^\r\n]{11,}$/m,
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
    name: "credentialed URL",
    pattern:
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^\s/:@]+:[^\s/@]{8,}@/i,
  },
  {
    name: "private AI session link",
    pattern: /^[A-Za-z]+-Session:\s*https?:\/\/\S+\/(?:code\/)?session_/im,
  },
];

const failures = [];

for (const file of files) {
  scanPath(file, "working tree");

  let content;
  try {
    content = staged ? git(["show", `:${file}`]) : readFileSync(file, "utf8");
  } catch {
    continue;
  }
  scanContent(content, `${file}: working tree`, file);
}

let historyBlobs = 0;
if (history) {
  const revisions = git(["rev-list", "--all"])
    .trim()
    .split("\n")
    .filter(Boolean);
  const blobs = new Map();

  for (const revision of revisions) {
    scanContent(
      git(["show", "-s", "--format=%B", revision]),
      `${revision.slice(0, 12)}: commit message`,
    );

    const entries = git(["ls-tree", "-r", "-z", revision])
      .split("\0")
      .filter(Boolean);
    for (const entry of entries) {
      const match = entry.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/s);
      if (!match) continue;
      const [, objectId, path] = match;
      scanPath(path, revision.slice(0, 12));
      if (!blobs.has(objectId)) {
        blobs.set(objectId, { path, revision: revision.slice(0, 12) });
      }
    }
  }

  for (const [objectId, source] of blobs) {
    scanContent(
      git(["cat-file", "blob", objectId]),
      `${source.path}: history ${source.revision}`,
      source.path,
    );
  }
  historyBlobs = blobs.size;
}

if (failures.length > 0) {
  console.error("Public-safety check failed:");
  for (const failure of new Set(failures)) console.error(`- ${failure}`);
  console.error(
    "Remove the value from Git history and rotate it if it was ever usable.",
  );
  process.exit(1);
}

const historySummary = history ? ` and ${historyBlobs} reachable blobs` : "";
console.log(
  `Public-safety check passed (${files.length} current files${historySummary}).`,
);

function scanPath(path, source) {
  if (
    isEnvironmentFile(path) ||
    forbiddenPaths.some((pattern) => pattern.test(path))
  ) {
    failures.push(`${path}: sensitive path found in ${source}`);
  }
}

function isEnvironmentFile(path) {
  const basename = path.split("/").at(-1);
  return basename?.startsWith(".env") && basename !== ".env.example";
}

function scanContent(content, source, path) {
  if (content.includes("\0")) return;
  if (path) scanDependencyReferences(content, source, path);
  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(content)) failures.push(`${source}: detected ${name}`);
  }
}

function scanDependencyReferences(content, source, path) {
  if (path.endsWith("package.json")) {
    try {
      const manifest = JSON.parse(content);
      for (const group of [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
        "overrides",
      ]) {
        for (const [name, specifier] of Object.entries(manifest[group] ?? {})) {
          if (
            typeof specifier === "string" &&
            /^(?:file|link):/.test(specifier)
          ) {
            failures.push(
              `${source}: ${group}.${name} uses a local package reference`,
            );
          }
        }
      }
    } catch {
      return;
    }
  }

  if (
    /(?:^|\/)pnpm-(?:lock|workspace)\.yaml$/.test(path) &&
    /^\s*(?:(?:specifier|version|tarball)|["'][^"']+["']):\s*(?:file|link):/m.test(
      content,
    )
  ) {
    failures.push(`${source}: contains a local package reference`);
  }
}

function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}
