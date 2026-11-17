import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);

test("root entry re-exports every domain entry (names are the union, same bindings)", async () => {
  const root = await import("../dist/index.js");
  const foundation = await import("../dist/foundation/index.js");
  const date = await import("../dist/date/index.js");
  const calendar = await import("../dist/calendar/index.js");
  const union = [
    ...new Set([
      ...Object.keys(foundation),
      ...Object.keys(date),
      ...Object.keys(calendar),
    ]),
  ].sort();
  assert.deepEqual(Object.keys(root).sort(), union);
  for (const [name, value] of Object.entries({
    ...foundation,
    ...date,
    ...calendar,
  })) {
    assert.equal((root as Record<string, unknown>)[name], value, name);
  }
  for (const domain of [date, calendar]) {
    assert.equal(
      Object.keys(foundation).filter((name) => name in domain).length,
      0,
    );
  }
  assert.equal(Object.keys(date).filter((name) => name in calendar).length, 0);
});
