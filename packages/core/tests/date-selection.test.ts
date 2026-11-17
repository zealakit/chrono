import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addBetween,
  isBlocked,
  pickRange,
  toggleDate,
} from "../dist/date/index.js";
import { plainDate } from "../dist/foundation/index.js";

const d = (day: number) => plainDate(2026, 11, day);
const days = (list: readonly { day: number }[]) => list.map((x) => x.day);

test("range: first pick starts a draft, second completes", () => {
  const first = pickRange(null, d(10), {});
  assert.equal(first.kind, "draft");
  const draft = { start: d(10), end: null };
  const second = pickRange(draft, d(14), {});
  assert.equal(second.kind, "complete");
  if (second.kind === "complete") {
    assert.deepEqual([second.value.start.day, second.value.end.day], [10, 14]);
  }
});

test("range: a second pick before the start swaps", () => {
  const result = pickRange({ start: d(10), end: null }, d(4), {});
  assert.equal(result.kind, "complete");
  if (result.kind === "complete") {
    assert.deepEqual([result.value.start.day, result.value.end.day], [4, 10]);
  }
});

test("range: picking in a complete range starts a new draft", () => {
  const result = pickRange({ start: d(1), end: d(5) }, d(20), {});
  assert.equal(result.kind, "draft");
});

test("range: a one-day range is valid when minDays <= 1", () => {
  assert.equal(
    pickRange({ start: d(10), end: null }, d(10), { minDays: 1 }).kind,
    "complete",
  );
  const short = pickRange({ start: d(10), end: null }, d(10), { minDays: 2 });
  assert.deepEqual(short, { kind: "invalid", reason: "too-short" });
});

test("range: limits, unavailable days and dynamic minDays", () => {
  const constraints = {
    maxDays: 3,
    isDateUnavailable: (x: { day: number }) => x.day === 12,
  };
  assert.deepEqual(pickRange({ start: d(10), end: null }, d(15), constraints), {
    kind: "invalid",
    reason: "too-long",
  });
  assert.deepEqual(
    pickRange({ start: d(10), end: null }, d(13), {
      isDateUnavailable: constraints.isDateUnavailable,
    }),
    { kind: "invalid", reason: "contains-unavailable" },
  );
  assert.equal(
    isBlocked(d(10), d(11), { minDays: (s) => (s.day === 10 ? 3 : 1) }),
    true,
  );
  assert.equal(
    isBlocked(d(11), d(12), { minDays: (s) => (s.day === 10 ? 3 : 1) }),
    false,
  );
  assert.deepEqual(pickRange(null, d(12), constraints), {
    kind: "invalid",
    reason: "start-invalid",
  });
});

test("multi: toggle, sorted unique, maxSelected", () => {
  let value = toggleDate([], d(9), {});
  value = toggleDate(value, d(3), {});
  assert.deepEqual(days(value), [3, 9]);
  assert.deepEqual(days(toggleDate(value, d(3), {})), [9]);
  assert.deepEqual(days(toggleDate(value, d(20), {}, 2)), [3, 9]);
});

test("multi: shift-add skips unselectable days and stops at the cap", () => {
  const blocked = { isDateDisabled: (x: { day: number }) => x.day === 6 };
  assert.deepEqual(days(addBetween([], d(4), d(8), blocked)), [4, 5, 7, 8]);
  assert.deepEqual(days(addBetween([], d(8), d(4), blocked)), [4, 5, 7, 8]);
  assert.deepEqual(days(addBetween([], d(4), d(8), {}, 3)), [4, 5, 6]);
});
