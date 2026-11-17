import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);

test("built entry loads and exports nothing yet", async () => {
  const adapter = await import("../dist/index.js");
  assert.deepEqual(Object.keys(adapter), []);
});

test("resolves @zealakit/chrono-core from the workspace build", async () => {
  const resolved = import.meta.resolve("@zealakit/chrono-core");
  assert.match(resolved, /\/packages\/core\/dist\/index\.js$/);
  await import("@zealakit/chrono-core");
});
