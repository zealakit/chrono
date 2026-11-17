import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);

test("root entry re-exports the foundation entry", async () => {
  const root = await import("../dist/index.js");
  const foundation = await import("../dist/foundation/index.js");
  assert.deepEqual(Object.keys(root).sort(), Object.keys(foundation).sort());
  assert.ok(Object.keys(root).length > 0);
});
