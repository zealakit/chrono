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
  const out = Object.values(result.metafile.outputs)[0];
  return Object.entries(out.inputs)
    .filter(([, info]) => info.bytesInOutput > 0)
    .map(([file]) => file);
};

test("plan 12 R1: the base calendar reaches no recurrence code, the pack does", {
  skip: !existsSync(entry),
}, async () => {
  const base = await inputs(
    `export { createCalendarController } from ${JSON.stringify(entry)};`,
  );
  assert.ok(base.length > 0);
  assert.deepEqual(
    base.filter((file) => file.includes("calendar/recurrence/")),
    [],
    "base bundle must not include the recurrence engine",
  );
  const pack = await inputs(
    `export { createCalendarController, recurrence } from ${JSON.stringify(entry)};`,
  );
  assert.ok(pack.some((file) => file.includes("calendar/recurrence/rrule")));
  assert.ok(pack.some((file) => file.includes("calendar/recurrence/expand")));
  assert.ok(pack.some((file) => file.includes("calendar/recurrence/series")));
  assert.ok(pack.some((file) => file.includes("calendar/recurrence/pack")));
});
