import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { CORE_EXAMPLES, groupExamples } from "../examples.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("every example folder lands in exactly one group", () => {
  const folders = readdirSync(join(root, "examples"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(root, "examples", entry.name, "package.json")),
    )
    .map((entry) => entry.name)
    .sort();
  const { core, integrations } = groupExamples(root);
  assert.deepEqual([...core, ...integrations].sort(), folders);
  assert.equal(core.filter((name) => integrations.includes(name)).length, 0);
});

test("the core examples that exist are the documented ones", () => {
  const { core } = groupExamples(root);
  for (const name of core) assert.ok(CORE_EXAMPLES.includes(name));
  for (const name of ["vanilla", "react", "vue", "svelte", "nextjs"])
    assert.ok(core.includes(name), name);
});

test("release:check is check + readme + audit + standalone, and audit:prod exists", () => {
  const { scripts } = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  assert.equal(
    scripts["release:check"],
    "pnpm check && pnpm readme:check && pnpm audit:prod && pnpm check:standalone",
  );
  assert.ok(scripts["audit:prod"]);
});
