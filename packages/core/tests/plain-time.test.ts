import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addMinutes,
  addSeconds,
  fromSecondOfDay,
  plainDateTime,
  plainDate,
  plainTime,
  toSecondOfDay,
} from "../dist/foundation/index.js";

test("plainTime validates and freezes", () => {
  assert.deepEqual(plainTime(9, 5), { hour: 9, minute: 5, second: 0 });
  assert.ok(Object.isFrozen(plainTime(0, 0)));
  for (const bad of [
    [24, 0],
    [0, 60],
    [0, 0, 60],
    [-1, 0],
    [1.5, 0],
  ] as [number, number, number?][]) {
    assert.throws(() => plainTime(...bad), RangeError);
  }
});

test("wraps at midnight and reports the day carry", () => {
  assert.deepEqual(addMinutes(plainTime(23, 30), 45), {
    time: plainTime(0, 15),
    dayDelta: 1,
  });
  assert.deepEqual(addMinutes(plainTime(0, 10), -20), {
    time: plainTime(23, 50),
    dayDelta: -1,
  });
  assert.deepEqual(addSeconds(plainTime(12, 0, 0), 30), {
    time: plainTime(12, 0, 30),
    dayDelta: 0,
  });
  assert.deepEqual(addMinutes(plainTime(12, 0), 3 * 1440), {
    time: plainTime(12, 0),
    dayDelta: 3,
  });
});

test("second of day round trip", () => {
  for (let seconds = 0; seconds < 86400; seconds += 37) {
    assert.equal(toSecondOfDay(fromSecondOfDay(seconds)), seconds);
  }
  assert.throws(() => fromSecondOfDay(86400), RangeError);
  assert.throws(() => fromSecondOfDay(-1), RangeError);
});

test("plainDateTime combines a date and a time", () => {
  const value = plainDateTime(plainDate(2026, 11, 17), plainTime(8, 30, 15));
  assert.deepEqual(value, {
    calendar: "gregory",
    year: 2026,
    month: 11,
    day: 17,
    hour: 8,
    minute: 30,
    second: 15,
  });
  assert.ok(Object.isFrozen(value));
});
