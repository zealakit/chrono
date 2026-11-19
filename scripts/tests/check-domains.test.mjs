import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { checkDomains, parseImports } from "../check-domains.mjs";

/** Build a throwaway repo: `files` maps "<pkg>/<tree>/<path>" to source text. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "chrono-domains-"));
  const packages = new Set(
    Object.keys(files).map((path) => path.split("/")[0]),
  );
  for (const id of packages) {
    mkdirSync(join(root, "packages", id), { recursive: true });
    writeFileSync(join(root, "packages", id, "package.json"), "{}");
  }
  for (const [path, text] of Object.entries(files)) {
    const [id, ...rest] = path.split("/");
    const full = join(root, "packages", id, ...rest);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

function run(files) {
  const root = fixture(files);
  try {
    return checkDomains(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const base = {
  "core/src/index.ts": 'export * from "./foundation/index.js";\n',
  "core/src/foundation/index.ts": 'export { a } from "./a.js";\n',
  "core/src/foundation/a.ts": "export const a = 1;\n",
};

test("parseImports finds every import form and ignores comments", () => {
  const found = parseImports(`
    import { a } from "./a.js";
    import type { B } from './b.js';
    export * from "./c.js";
    export { d } from "./d.js";
    import "./e.js";
    const f = await import("./f.js");
    import {
      g,
    } from "./g.js";
    // import { no } from "./comment.js";
    /* import { no } from "./block.js"; */
  `);
  assert.deepEqual(found.sort(), [
    "./a.js",
    "./b.js",
    "./c.js",
    "./d.js",
    "./e.js",
    "./f.js",
    "./g.js",
  ]);
});

test("allowed imports pass", () => {
  assert.deepEqual(
    run({
      ...base,
      "core/src/date/index.ts": 'export * from "./date.js";\n',
      "core/src/date/date.ts":
        'import { a } from "../foundation/index.js";\nexport const d = a;\n',
      "core/src/time/index.ts":
        'import { a } from "../foundation/index.js";\nexport const t = a;\n',
      "core/src/datetime/index.ts":
        'import { d } from "../date/index.js";\nimport { t } from "../time/index.js";\nexport const dt = [d, t];\n',
      "core/src/calendar/index.ts":
        'import { d } from "../date/index.js";\nimport { t } from "../time/index.js";\nexport const c = [d, t];\n',
    }),
    [],
  );
});

test("time importing date is a violation, directly and by reachability", () => {
  const violations = run({
    ...base,
    "core/src/date/index.ts": "export const d = 1;\n",
    "core/src/time/index.ts":
      'import { d } from "../date/index.js";\nexport const t = d;\n',
  });
  assert.ok(
    violations.some((line) => line.includes("time/ may not import date/")),
    violations.join("\n"),
  );
  assert.ok(
    violations.some((line) =>
      line.includes("entry reaches forbidden domain date/"),
    ),
    violations.join("\n"),
  );
});

test("calendar may use date and time; nothing may import calendar", () => {
  const violations = run({
    ...base,
    "core/src/calendar/index.ts": "export const c = 1;\n",
    "core/src/date/index.ts":
      'import { c } from "../calendar/index.js";\nexport const d = c;\n',
  });
  assert.ok(
    violations.some((line) => line.includes("date/ may not import calendar/")),
  );
});

test("importing the package's own root index is a violation", () => {
  const violations = run({
    ...base,
    "core/src/date/index.ts": 'import "../index.js";\nexport const d = 1;\n',
  });
  assert.ok(
    violations.some((line) =>
      line.includes("imports the package's own root index"),
    ),
    violations.join("\n"),
  );
});

test("the root index may only re-export domain entries", () => {
  const violations = run({
    ...base,
    "core/src/helper.ts": "export const h = 1;\n",
    "core/src/index.ts":
      'export * from "./foundation/index.js";\nexport * from "./helper.js";\n',
  });
  assert.ok(
    violations.some((line) =>
      line.includes("root index may only re-export domain entries"),
    ),
    violations.join("\n"),
  );
});

test("import cycles are reported", () => {
  const violations = run({
    ...base,
    "core/src/foundation/a.ts":
      'import { b } from "./b.js";\nexport const a = b;\n',
    "core/src/foundation/b.ts":
      'import { a } from "./a.js";\nexport const b = a;\n',
  });
  assert.ok(
    violations.some((line) => line.includes("import cycle")),
    violations.join("\n"),
  );
});

test("adapter domain folders use matching core subpaths", () => {
  const files = {
    ...base,
    "core/src/date/index.ts": "export const d = 1;\n",
    "core/src/time/index.ts": "export const t = 1;\n",
    "react/src/index.ts": 'export * from "./time/index.js";\n',
    "react/src/shared/slot.ts":
      'import "@zealakit/chrono-core/foundation";\nexport const slot = 1;\n',
  };
  assert.deepEqual(
    run({
      ...files,
      "react/src/time/index.ts":
        'import "@zealakit/chrono-core/time";\nimport { slot } from "../shared/slot.js";\nexport const x = slot;\n',
    }),
    [],
  );
  const bad = run({
    ...files,
    "react/src/time/index.ts":
      'import "@zealakit/chrono-core/date";\nexport const x = 1;\n',
  });
  assert.ok(
    bad.some((line) => line.includes("time/ may not import date/")),
    bad.join("\n"),
  );
  const root = run({
    ...files,
    "react/src/time/index.ts":
      'import "@zealakit/chrono-core";\nexport const x = 1;\n',
  });
  assert.ok(
    root.some((line) => line.includes("must import a core subpath")),
    root.join("\n"),
  );
});

test("adapters never import another adapter or themselves by name", () => {
  const files = { ...base, "react/src/index.ts": "export {};\n" };
  const other = run({
    ...files,
    "react/src/shared/x.ts": 'import "@zealakit/chrono-vue";\n',
  });
  assert.ok(
    other.some((line) => line.includes("an adapter imports another adapter")),
  );
  const self = run({
    ...files,
    "react/src/shared/x.ts": 'import "@zealakit/chrono-react";\n',
  });
  assert.ok(self.some((line) => line.includes("imports its own root index")));
});

test("dist is checked too (compiled JavaScript)", () => {
  const violations = run({
    "core/dist/index.js": 'export * from "./foundation/index.js";\n',
    "core/dist/foundation/index.js": "export const a = 1;\n",
    "core/dist/date/index.js": "export const d = 1;\n",
    "core/dist/time/index.js": 'export { d } from "../date/index.js";\n',
  });
  assert.ok(
    violations.some((line) =>
      line.startsWith("packages/core/dist/time/index.js"),
    ),
    violations.join("\n"),
  );
});

test("a picker may import its adapter, its Overlay and its framework, never core or another picker", () => {
  const ok = run({
    ...base,
    "picker-react/src/index.ts":
      'import { DatePanel } from "@zealakit/chrono-react/date";\nimport { Popover } from "@zealakit/overlay-react";\nimport { useState } from "react";\nexport * from "./a.js";\n',
    "picker-react/src/a.ts": "export const a = 1;\n",
  });
  assert.deepEqual(
    ok.filter((line) => line.includes("picker-react")),
    [],
  );
  const bad = run({
    ...base,
    "picker-react/src/index.ts":
      'import type { PlainDate } from "@zealakit/chrono-core/foundation";\nimport { x } from "@zealakit/chrono-picker-vue";\nimport { y } from "@zealakit/overlay-vue";\n',
  });
  assert.equal(bad.filter((line) => line.includes("picker-react")).length, 3);
});
