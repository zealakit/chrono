import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);

test("root entry re-exports every domain entry (names are the union, same bindings)", async () => {
  const root = await import("../dist/index.js");
  const foundation = await import("../dist/foundation/index.js");
  const calendar = await import("../dist/calendar/index.js");
  const union = [
    ...new Set([...Object.keys(foundation), ...Object.keys(calendar)]),
  ].sort();
  assert.deepEqual(Object.keys(root).sort(), union);
  for (const [name, value] of Object.entries({ ...foundation, ...calendar })) {
    assert.equal((root as Record<string, unknown>)[name], value, name);
  }
  assert.equal(
    Object.keys(foundation).filter((name) => name in calendar).length,
    0,
  );
});
