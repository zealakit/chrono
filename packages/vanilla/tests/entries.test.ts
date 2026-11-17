import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseImports,
  resolveRelative,
} from "../../../scripts/check-domains.mjs";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

test("root export names equal the union of the subpath names, and are the same bindings (02 §8)", async () => {
  const root = (await import("../dist/index.js")) as Record<string, unknown>;
  const calendar = (await import("../dist/calendar/index.js")) as Record<
    string,
    unknown
  >;
  assert.deepEqual(Object.keys(root).sort(), Object.keys(calendar).sort());
  assert.ok(Object.keys(root).length >= 8);
  for (const [name, value] of Object.entries(calendar))
    assert.equal(root[name], value, name);
});

test("/calendar reaches only dist/calendar and core foundation + calendar", () => {
  const seen = new Set<string>();
  const external = new Set<string>();
  const queue = [join(dist, "calendar/index.js")];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const specifier of parseImports(readFileSync(file, "utf8"))) {
      if (specifier.startsWith(".")) {
        const resolved = resolveRelative(file, specifier);
        if (resolved) queue.push(resolved);
      } else {
        external.add(specifier);
      }
    }
  }
  for (const file of seen) assert.match(relative(dist, file), /^calendar\//);
  assert.deepEqual([...external].sort(), [
    "@zealakit/chrono-core/calendar",
    "@zealakit/chrono-core/foundation",
  ]);
});

test("importing the entry touches no DOM global at import time", () => {
  const text = readFileSync(join(dist, "calendar/create-calendar.js"), "utf8");
  assert.doesNotMatch(
    text.split("export function createCalendar")[0] as string,
    /\bdocument\b|\bwindow\b/,
  );
});
