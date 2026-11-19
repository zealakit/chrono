import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dayOfWeek,
  daysInMonth,
  fromEpochDay,
  isLeapYear,
  toEpochDay,
} from "../dist/foundation/index.js";

test("fromEpochDay(toEpochDay(d)) round-trips every day of 0001-01-01 .. 9999-12-31", () => {
  let expected = -719162;
  assert.equal(toEpochDay({ year: 1, month: 1, day: 1 }), expected);
  for (let year = 1; year <= 9999; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const length = daysInMonth(year, month);
      for (let day = 1; day <= length; day += 1) {
        const epoch = toEpochDay({ year, month, day });
        const back = fromEpochDay(epoch);
        if (
          epoch !== expected ||
          back.year !== year ||
          back.month !== month ||
          back.day !== day
        ) {
          assert.fail(
            `mismatch at ${year}-${month}-${day}: epoch ${epoch}, expected ${expected}`,
          );
        }
        expected += 1;
      }
    }
  }
  assert.equal(expected - 1, 2932896);
});

test("agrees with Date.UTC for 1900-2100", () => {
  for (let year = 1900; year <= 2100; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [1, 15, daysInMonth(year, month)]) {
        const oracle = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
        assert.equal(toEpochDay({ year, month, day }), oracle);
        const weekday =
          new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
        assert.equal(dayOfWeek({ year, month, day }), weekday);
      }
    }
  }
});

test("fromEpochDay rejects years outside 1-9999", () => {
  assert.throws(() => fromEpochDay(-719163), RangeError);
  assert.throws(() => fromEpochDay(2932897), RangeError);
});

test("leap years", () => {
  assert.deepEqual([1900, 2000, 2024, 2100].map(isLeapYear), [
    false,
    true,
    true,
    false,
  ]);
});
