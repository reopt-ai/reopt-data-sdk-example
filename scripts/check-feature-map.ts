#!/usr/bin/env tsx

import { readFileSync } from "node:fs";

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

console.log(`README feature map matches ${FEATURE_MAP.length} source rows.`);
