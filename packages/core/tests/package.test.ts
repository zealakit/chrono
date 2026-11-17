import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);

test("built entry loads and exports nothing yet", async () => {
  const core = await import("../dist/index.js");
  assert.deepEqual(Object.keys(core), []);
});
