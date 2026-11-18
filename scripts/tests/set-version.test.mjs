import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PACKAGE_DIRS,
  planVersionChange,
  setVersion,
} from "../set-version.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const withCopy = (run) => {
  const dir = mkdtempSync(join(tmpdir(), "chrono-version-"));
  try {
    for (const name of PACKAGE_DIRS) {
      cpSync(
        join(root, "packages", name, "package.json"),
        join(dir, "packages", name, "package.json"),
        {
          recursive: true,
        },
      );
    }
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const read = (dir, name) =>
  JSON.parse(readFileSync(join(dir, "packages", name, "package.json"), "utf8"));

test("sets one version in every manifest and keeps their other fields", () => {
  withCopy((dir) => {
    const before = read(dir, "react");
    const plan = setVersion(dir, "99.0.0-rc.0");
    assert.equal(plan.changes.length, PACKAGE_DIRS.length);
    for (const name of PACKAGE_DIRS)
      assert.equal(read(dir, name).version, "99.0.0-rc.0");
    assert.deepEqual(
      { ...read(dir, "react"), version: before.version },
      before,
    );
  });
});

test("an equal version is a no-op and a lower one is refused unless forced", () => {
  withCopy((dir) => {
    const current = read(dir, "core").version;
    assert.deepEqual(setVersion(dir, current).changes, []);
    assert.throws(() => setVersion(dir, "0.0.1"), /lower/);
    assert.equal(
      setVersion(dir, "0.0.1", { force: true }).changes.length,
      PACKAGE_DIRS.length,
    );
  });
});

test("invalid versions and diverged manifests are refused", () => {
  assert.throws(
    () => planVersionChange({ a: { version: "1.0.0" } }, "1.0"),
    /not a valid/,
  );
  assert.throws(
    () =>
      planVersionChange(
        { a: { version: "1.0.0" }, b: { version: "1.1.0" } },
        "2.0.0",
      ),
    /share a version/,
  );
});
