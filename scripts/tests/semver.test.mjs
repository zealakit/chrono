import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareVersions,
  isPrerelease,
  parseVersion,
  publishTagFor,
} from "../lib/semver.mjs";

test("orders prereleases below their release", () => {
  const ordered = [
    "0.4.0-next.1",
    "0.4.0-next.2",
    "0.4.0",
    "1.0.0-rc.0",
    "1.0.0",
    "1.0.1",
  ];
  for (let i = 0; i < ordered.length - 1; i += 1) {
    assert.equal(
      compareVersions(ordered[i], ordered[i + 1]),
      -1,
      `${ordered[i]} < ${ordered[i + 1]}`,
    );
    assert.equal(compareVersions(ordered[i + 1], ordered[i]), 1);
  }
  assert.equal(compareVersions("1.2.3", "1.2.3"), 0);
});

test("prerelease identifier rules: numeric < alphanumeric, shorter < longer, numeric compare", () => {
  assert.equal(compareVersions("1.0.0-1", "1.0.0-alpha"), -1);
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0-alpha.1"), -1);
  assert.equal(compareVersions("1.0.0-rc.2", "1.0.0-rc.10"), -1);
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0-beta"), -1);
});

test("parses and rejects", () => {
  assert.deepEqual(parseVersion("1.2.3-rc.1"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["rc", "1"],
  });
  for (const bad of ["1.2", "v1.2.3", "01.2.3", "1.2.3-", ""]) {
    assert.equal(parseVersion(bad), null, bad);
  }
  assert.throws(() => compareVersions("x", "1.0.0"));
});

test("the dist-tag rule: prereleases never reach latest", () => {
  assert.equal(publishTagFor("1.0.0"), "latest");
  assert.equal(publishTagFor("1.0.0-rc.0"), "next");
  assert.equal(publishTagFor("0.4.0-next.1"), "next");
  assert.equal(isPrerelease("1.0.0"), false);
});
