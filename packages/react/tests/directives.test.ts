import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dist).filter((file) => file.endsWith(".js"));
const startsWithDirective = (text: string) =>
  /^\s*["']use client["'];?/.test(text);
const definesComponentOrHook = (text: string) =>
  /\bforwardRef\(|\bcreateContext\(|\buse(State|Effect|Ref|Memo|Context|SyncExternalStore|LayoutEffect|Id)\(|\/jsx-runtime/.test(
    text,
  );
const isEntry = (file: string) => /(^|\/)index\.js$/.test(relative(dist, file));

test('every file that defines a component or hook starts with "use client"', () => {
  assert.ok(files.length > 5);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (definesComponentOrHook(text)) {
      assert.ok(
        startsWithDirective(text),
        `${relative(dist, file)} needs "use client"`,
      );
    }
  }
});

test("entry files and utility modules have no directive (C13)", () => {
  const entries = files.filter(isEntry);
  assert.ok(entries.length >= 2);
  for (const file of entries) {
    assert.equal(
      startsWithDirective(readFileSync(file, "utf8")),
      false,
      relative(dist, file),
    );
  }
  for (const name of [
    "calendar/utilities.js",
    "calendar/options.js",
    "shared/merge-props.js",
    "shared/to-react-props.js",
  ]) {
    assert.equal(
      startsWithDirective(readFileSync(join(dist, name), "utf8")),
      false,
      name,
    );
  }
});

test("utilities are plain functions with no React import", () => {
  const text = readFileSync(join(dist, "calendar/utilities.js"), "utf8");
  assert.doesNotMatch(text, /from "react/);
  assert.match(text, /getCalendarTitle/);
});
