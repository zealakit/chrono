import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const entry = join(root, "packages", "core", "dist", "calendar", "index.js");

const inputs = async (contents) => {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: "js" },
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "neutral",
    logLevel: "silent",
  });
  // Only files that contribute bytes to the output (tree-shaken modules do not).
  const out = Object.values(result.metafile.outputs)[0];
  return Object.entries(out.inputs)
    .filter(([, info]) => info.bytesInOutput > 0)
    .map(([file]) => file);
};

test("plan 10 R4: the base calendar reaches no resource code, the pack does", {
  skip: !existsSync(entry),
}, async () => {
  const base = await inputs(
    `export { createCalendarController } from ${JSON.stringify(entry)};`,
  );
  assert.ok(base.length > 0);
  const leaked = base.filter(
    (file) =>
      file.includes("calendar/resources/") && !file.endsWith("/keys.js"),
  );
  assert.deepEqual(
    leaked,
    [],
    "base bundle must not include resource layouts (keys.js is the shared cell-key helper)",
  );
  const pack = await inputs(
    `export { createCalendarController, resourceViews } from ${JSON.stringify(entry)};`,
  );
  assert.ok(
    pack.some((file) => file.includes("calendar/resources/timeline-layout")),
  );
  assert.ok(
    pack.some((file) => file.includes("calendar/resources/resource-time-grid")),
  );
});
