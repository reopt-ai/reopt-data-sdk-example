import { readFile, writeFile } from "node:fs/promises";

// A reviewed list of repository-owned public files. Never accept visitor URLs.
const root = new URL("../", import.meta.url);
const entries = [
  ["/images/products/halo-desk-lamp.webp", "image/webp"],
  ["/fonts/replay/JetBrainsMono-Regular.woff2", "font/woff2"],
];
const assets = [];
for (const [url, mime] of entries) {
  const bytes = await readFile(new URL(`public${url}`, root));
  if (bytes.length > 128 * 1024)
    throw new Error("Public replay asset exceeds the SDK file budget");
  assets.push({
    url,
    dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
  });
}
await writeFile(
  new URL("lib/reopt/replay-public-assets.json", root),
  `${JSON.stringify(assets, null, 2)}\n`,
);
