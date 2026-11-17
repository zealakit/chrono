import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { resolveCoreExport, rewriteCoreSpecifiers } from "../bundle-core.mjs";

const exportsMap = {
  ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
  "./time": { types: "./dist/time/index.d.ts", import: "./dist/time/index.js" },
  "./package.json": "./package.json",
};
const pkg = "/tmp/package";
const vendor = join(pkg, "dist/vendor/core");

test("rewrites the bare specifier to the vendored root entry", () => {
  const out = rewriteCoreSpecifiers(
    'import { a } from "@zealakit/chrono-core";',
    join(pkg, "dist/index.js"),
    vendor,
    exportsMap,
  );
  assert.equal(out, 'import { a } from "./vendor/core/index.js";');
});

test("rewrites subpath specifiers through the exports map", () => {
  const out = rewriteCoreSpecifiers(
    "export * from '@zealakit/chrono-core/time';",
    join(pkg, "dist/time/input.d.ts"),
    vendor,
    exportsMap,
  );
  assert.equal(out, "export * from '../vendor/core/time/index.js';");
});

test("leaves files without a Core import unchanged", () => {
  const source = 'import { x } from "./x.js";';
  assert.equal(
    rewriteCoreSpecifiers(source, join(pkg, "dist/a.js"), vendor, exportsMap),
    source,
  );
});

test("fails on a subpath Core does not export", () => {
  assert.throws(
    () => resolveCoreExport(exportsMap, "./date"),
    /does not export "\.\/date"/,
  );
});

test("fails on a non-literal Core reference", () => {
  assert.throws(
    () =>
      rewriteCoreSpecifiers(
        "const name = `@zealakit/chrono-core`;",
        join(pkg, "dist/a.js"),
        vendor,
        exportsMap,
      ),
    /cannot rewrite/,
  );
});
