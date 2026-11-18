import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  collectVocabulary,
  diffVocabulary,
  findAnyTypes,
} from "../audit-api.mjs";

const fixture = (files) => {
  const dir = mkdtempSync(join(tmpdir(), "chrono-audit-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
};

test("collects data attributes and custom properties from source", () => {
  const dir = fixture({
    "packages/core/src/a.ts":
      'const x = { "data-foo": 1, \'--chrono-bar\': 2, "aria-label": 3 };',
    "packages/react/src/b.tsx": "const y = `data-baz`;",
  });
  try {
    assert.deepEqual(collectVocabulary(dir), [
      "--chrono-bar",
      "data-baz",
      "data-foo",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a removed or renamed name is reported, a new one too", () => {
  assert.deepEqual(diffVocabulary(["a", "c"], ["a", "b"]), {
    added: ["c"],
    removed: ["b"],
  });
});

test("finds any in declaration files but not in comments", () => {
  const dir = fixture({
    "packages/react/dist/a.d.ts": "export declare const x: any;",
    "packages/react/dist/b.d.ts":
      "/** any value */\nexport declare const y: string; // any",
  });
  try {
    const problems = findAnyTypes(dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /a\.d\.ts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
