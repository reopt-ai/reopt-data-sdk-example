#!/usr/bin/env tsx

import { existsSync, globSync, readFileSync } from "node:fs";

import { FEATURE_MAP } from "../lib/reopt/feature-map";

interface ReadmeRow {
  area: string;
  api: string;
  where: string;
}

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const section = readme
  .split("<!-- FEATURE-MAP:START")[1]
  ?.split("<!-- FEATURE-MAP:END")[0];

if (!section) throw new Error("README feature-map markers are missing");

const rows: ReadmeRow[] = section
  .split("\n")
  .filter((line) => /^\| (?:Browser|Server|Proxy|Node|Test)\s*\|/.test(line))
  .map((line) => {
    const cells = line.split("|");
    return {
      area: cells[1]!.trim().toLowerCase(),
      api: cells[2]!.trim().replaceAll("`", ""),
      where: cells[3]!.trim().replaceAll("`", ""),
    };
  });

const missing = FEATURE_MAP.filter(
  (expected) =>
    !rows.some(
      (actual) =>
        actual.area === expected.area &&
        actual.api === expected.api &&
        actual.where === expected.where,
    ),
);

if (rows.length !== FEATURE_MAP.length || missing.length > 0) {
  throw new Error(
    `README feature map does not match lib/reopt/feature-map.ts: ` +
      `${rows.length}/${FEATURE_MAP.length} rows; missing ${
        missing.map((row) => row.api).join(", ") || "none"
      }`,
  );
}

/**
 * The files a row points at have to be there.
 *
 * Comparing the README against the array only proves the two strings agree —
 * delete the implementation and keep the row and this gate still passed, which
 * is the drift it exists to catch. It cannot prove the API is called, but it
 * can refuse to let a row name a file that is gone.
 */
const dangling = FEATURE_MAP.flatMap((row) =>
  row.where
    .split("·")
    .map((path) => path.trim())
    .filter((path) => path.length > 0)
    .filter((path) =>
      path.includes("*")
        ? globSync(path).length === 0
        : !existsSync(new URL(`../${path}`, import.meta.url)),
    )
    .map((path) => `${row.api} → ${path}`),
);

if (dangling.length > 0) {
  throw new Error(
    `lib/reopt/feature-map.ts points at files that do not exist:\n  ${dangling.join("\n  ")}`,
  );
}

console.log(
  `README feature map matches ${FEATURE_MAP.length} source rows, and every file they name exists.`,
);
