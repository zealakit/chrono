import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/datetime/", import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
const files = walk(root).filter((file) => file.endsWith(".ts"));

/** Logic that belongs to date/, time/ or foundation/ (plan 08 §13.3). */
const FORBIDDEN = [
  "createSegmentEngine",
  "function tokenize",
  "function parseDate(",
  "function parseTime(",
  "function typeDigit",
  "function pickRange",
  "function toggleDate",
  "createSingleSelection",
];

test("datetime/ imports only date/, time/ and foundation/ (and itself), never calendar/", () => {
  assert.ok(files.length > 5);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/from\s+"([^"]+)"/g)) {
      const specifier = match[1] as string;
      if (!specifier.startsWith(".")) continue;
      const resolved = join(file, "..", specifier);
      const inside = resolved.startsWith(root);
      const ok =
        inside || /\/(foundation|date|time)\/index\.js$/.test(resolved);
      assert.ok(ok, `${file} imports ${specifier}`);
    }
  }
});

test("datetime/ declares no selection, segment or parsing logic of its own", () => {
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const word of FORBIDDEN) {
      assert.ok(!text.includes(word), `${file} contains "${word}"`);
    }
  }
});

test("controller files stay thin: logic is delegated", () => {
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n").length;
    assert.ok(lines <= 600, `${file} has ${lines} lines`);
  }
});
