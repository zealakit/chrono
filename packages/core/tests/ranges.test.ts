import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampDate,
  dateRangeLength,
  dateRangesOverlap,
  eachDay,
  intersectDateRanges,
  intervalDuration,
  intervalsOverlap,
  isDateInRange,
  normalizeDateRange,
  plainDate,
  plainDateTime,
  plainTime,
  splitIntervalByDay,
  toZoned,
} from "../dist/foundation/index.js";

const d = (y: number, m: number, day: number) => plainDate(y, m, day);
const dt = (y: number, m: number, day: number, h = 0, mi = 0) =>
  plainDateTime(plainDate(y, m, day), plainTime(h, mi));
const label = (value: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}) =>
  `${value.month}/${value.day} ${String(value.hour ?? 0).padStart(2, "0")}:${String(value.minute ?? 0).padStart(2, "0")}`;

test("date ranges are inclusive", () => {
  const range = { start: d(2026, 11, 17), end: d(2026, 11, 20) };
  assert.equal(dateRangeLength(range), 4);
  assert.equal(
    dateRangeLength({ start: d(2026, 11, 17), end: d(2026, 11, 17) }),
    1,
  );
  assert.equal(isDateInRange(d(2026, 11, 17), range), true);
  assert.equal(isDateInRange(d(2026, 11, 20), range), true);
  assert.equal(isDateInRange(d(2026, 11, 21), range), false);
  assert.deepEqual(normalizeDateRange(d(2026, 11, 20), d(2026, 11, 17)), range);
  assert.deepEqual(clampDate(d(2026, 1, 1), range), range.start);
  assert.deepEqual(clampDate(d(2027, 1, 1), range), range.end);
  assert.deepEqual(
    [...eachDay(range)].map((x) => x.day),
    [17, 18, 19, 20],
  );
});

test("range overlap and intersection (touching counts, it is inclusive)", () => {
  const a = { start: d(2026, 11, 1), end: d(2026, 11, 10) };
  const b = { start: d(2026, 11, 10), end: d(2026, 11, 15) };
  const c = { start: d(2026, 11, 11), end: d(2026, 11, 15) };
  assert.equal(dateRangesOverlap(a, b), true);
  assert.equal(dateRangesOverlap(a, c), false);
  assert.deepEqual(intersectDateRanges(a, b), {
    start: d(2026, 11, 10),
    end: d(2026, 11, 10),
  });
  assert.equal(intersectDateRanges(a, c), null);
});

test("intervals are half-open", () => {
  const a = { start: dt(2026, 5, 1, 9), end: dt(2026, 5, 1, 10) };
  const b = { start: dt(2026, 5, 1, 10), end: dt(2026, 5, 1, 11) };
  const c = { start: dt(2026, 5, 1, 9, 59), end: dt(2026, 5, 1, 10, 30) };
  assert.equal(intervalsOverlap(a, b), false);
  assert.equal(intervalsOverlap(a, c), true);
  assert.equal(intervalDuration(a), 3600000);
});

test("splitIntervalByDay across midnight (plain)", () => {
  const pieces = splitIntervalByDay({
    start: dt(2026, 5, 1, 22),
    end: dt(2026, 5, 3, 2),
  });
  assert.deepEqual(
    pieces.map((p) => [
      p.date.day,
      label(p.start),
      label(p.end),
      p.continuesBefore,
      p.continuesAfter,
    ]),
    [
      [1, "5/1 22:00", "5/2 00:00", false, true],
      [2, "5/2 00:00", "5/3 00:00", true, true],
      [3, "5/3 00:00", "5/3 02:00", true, false],
    ],
  );
  // Ending exactly at midnight does not create an empty piece.
  const exact = splitIntervalByDay({
    start: dt(2026, 5, 1, 22),
    end: dt(2026, 5, 2, 0),
  });
  assert.equal(exact.length, 1);
  assert.equal(exact[0]?.continuesAfter, false);
  assert.deepEqual(
    splitIntervalByDay({ start: dt(2026, 5, 1, 9), end: dt(2026, 5, 1, 9) }),
    [],
  );
});

test("splitIntervalByDay across DST days keeps real durations", () => {
  const zone = "America/New_York";
  const start = toZoned(dt(2026, 3, 7, 12), zone);
  const end = toZoned(dt(2026, 3, 9, 12), zone);
  const pieces = splitIntervalByDay({ start, end });
  const hours = pieces.map((p) => intervalDuration(p) / 3600000);
  assert.deepEqual(hours, [12, 23, 12]);
  const fall = splitIntervalByDay({
    start: toZoned(dt(2026, 10, 31, 12), zone),
    end: toZoned(dt(2026, 11, 2, 12), zone),
  });
  assert.deepEqual(
    fall.map((p) => intervalDuration(p) / 3600000),
    [12, 25, 12],
  );
  // Splitting in another zone cuts at that zone's midnight.
  const utc = splitIntervalByDay({ start, end }, "UTC");
  assert.equal(utc.length, 3);
  assert.deepEqual(
    utc.map((p) => p.date.day),
    [7, 8, 9],
  );
});
