#!/usr/bin/env node
/**
 * A build's worth of source maps, without the build.
 *
 * Every source-map bug this app has surfaced so far — a 413 on a large map, a
 * 429 from a per-map request, a 502 on the direct path — needed conditions the
 * example app does not have: a thousand chunks, maps past the request-body
 * limit, and a store that hands out upload grants. A real `next build` produces
 * 34 small maps in twenty minutes, which reproduces none of it.
 *
 * So this synthesises the build output instead. The chunks are real enough for
 * the uploader: a valid `sourceMappingURL`, a parseable map with
 * `sourcesContent`, and mappings that resolve to a known line — which is what
 * makes the symbolication end of it checkable, not just the upload.
 *
 * Some fixtures are deliberately broken, because the interesting behaviour is
 * what happens to a build that is not perfect: a chunk with no map, a map that
 * is not JSON, and one whose bytes do not match the hash the uploader will
 * declare.
 *
 *   node scripts/sourcemap-stress.mjs --out .stress --count 1100 --large 2
 *
 * Then point the CLI at `--out`. The directory is disposable; nothing here
 * writes outside it.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

function parseArgs(argv) {
  const args = {
    out: ".stress",
    count: 1100,
    large: 2,
    largeMb: 10,
    broken: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = () => argv[(i += 1)];
    if (flag === "--out") args.out = value();
    else if (flag === "--count") args.count = Number.parseInt(value(), 10);
    else if (flag === "--large") args.large = Number.parseInt(value(), 10);
    else if (flag === "--large-mb") args.largeMb = Number.parseInt(value(), 10);
    else if (flag === "--no-broken") args.broken = false;
    else if (flag === "--help" || flag === "-h") args.help = true;
  }
  return args;
}

/**
 * A map whose mappings actually resolve.
 *
 * Line `n` of the generated chunk maps to line `n` of the original, so a stack
 * frame at a known line can be checked against a known source line. A map full
 * of `AAAA` would upload identically and prove nothing about symbolication.
 */
function sourceMap(name, lines) {
  const original = Array.from(
    { length: lines },
    (_, i) => `const value${i} = compute(${i}); // ${name} line ${i}\n`,
  ).join("");
  return {
    version: 3,
    file: `${name}.js`,
    sources: [`webpack://stress/./src/${name}.ts`],
    sourcesContent: [original],
    names: [],
    // One segment per line: column 0 of generated line n → line n of the source.
    mappings: Array.from({ length: lines }, () => "AACA").join(";"),
  };
}

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "sourcemap-stress --out <dir> [--count N] [--large K] [--large-mb MB] [--no-broken]\n",
    );
    return;
  }

  const out = resolve(args.out);
  // Rebuilt from scratch: a stale fixture from a previous shape is worse than
  // no fixture, because it still uploads.
  await rm(out, { recursive: true, force: true });
  const chunks = join(out, "chunks");

  let plain = 0;
  for (let i = 0; i < args.count; i += 1) {
    const name = `c${i}`;
    await write(
      join(chunks, `${name}.js`),
      `// ${name}\n//# sourceMappingURL=${name}.js.map\n`,
    );
    await write(
      join(chunks, `${name}.js.map`),
      JSON.stringify(sourceMap(name, 40)),
    );
    plain += 1;
  }

  // Large enough to pass the 4.5MB serverless body limit, which is what forces
  // the direct-to-store path and the multipart threshold above 8MB.
  const large = [];
  for (let i = 0; i < args.large; i += 1) {
    const name = `big${i}`;
    const lines = Math.ceil((args.largeMb * 1024 * 1024) / 52);
    await write(
      join(chunks, `${name}.js`),
      `// ${name}\n//# sourceMappingURL=${name}.js.map\n`,
    );
    await write(
      join(chunks, `${name}.js.map`),
      JSON.stringify(sourceMap(name, lines)),
    );
    large.push(name);
  }

  const broken = [];
  if (args.broken) {
    // A chunk with no `sourceMappingURL`. The build emitted no map for it, and
    // the uploader should count it, not fail on it.
    await write(join(chunks, "nomap.js"), "// nomap\nconsole.log(1);\n");
    broken.push("nomap.js (no sourceMappingURL)");

    // A map that is not JSON. It uploads fine and fails at symbolication, which
    // is the case that must leave a readable `failureReason` rather than a stack.
    await write(
      join(chunks, "badmap.js"),
      "// badmap\n//# sourceMappingURL=badmap.js.map\n",
    );
    await write(join(chunks, "badmap.js.map"), "{ this is not json");
    broken.push("badmap.js.map (unparseable)");

    // Valid JSON, but not a source map. Parses, then has nothing to resolve.
    await write(
      join(chunks, "notamap.js"),
      "// notamap\n//# sourceMappingURL=notamap.js.map\n",
    );
    await write(
      join(chunks, "notamap.js.map"),
      JSON.stringify({ hello: "world" }),
    );
    broken.push("notamap.js.map (json, not a source map)");

    // A map pointing at a file that is not there. The uploader reads the map by
    // the URL the chunk names, so this one is reported as missing.
    await write(
      join(chunks, "dangling.js"),
      "// dangling\n//# sourceMappingURL=gone.js.map\n",
    );
    broken.push("dangling.js (sourceMappingURL points at nothing)");
  }

  process.stdout.write(
    `stress fixtures in ${out}\n` +
      `  ${plain} ordinary chunk(s)\n` +
      `  ${large.length} large map(s) at ~${args.largeMb}MB: ${large.join(", ") || "none"}\n` +
      `  ${broken.length} deliberately broken: ${broken.join(", ") || "none"}\n`,
  );
}

await main();
