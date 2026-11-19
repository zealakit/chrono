import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fromDate,
  fromTemporalLike,
  plainDate,
  plainDateTime,
  plainTime,
  toDate,
  toPlainDate,
  toPlainTime,
  toZoned,
} from "../dist/foundation/index.js";

test("Date to plain values uses the given zone, never the host zone", () => {
  const date = new Date(Date.UTC(2026, 10, 17, 23, 30));
  assert.deepEqual(toPlainDate(date), plainDate(2026, 11, 17));
  assert.deepEqual(
    toPlainDate(date, "Asia/Ho_Chi_Minh"),
    plainDate(2026, 11, 18),
  );
  assert.deepEqual(
    toPlainDate(date, "America/New_York"),
    plainDate(2026, 11, 17),
  );
  const zoned = fromDate(date, "Australia/Lord_Howe");
  assert.deepEqual(
    [zoned.day, zoned.hour, zoned.minute, zoned.offset],
    [18, 10, 30, 660],
  );
  assert.throws(() => fromDate(new Date(Number.NaN)), RangeError);
});

test("plain values to Date", () => {
  assert.equal(
    toDate(plainDate(2026, 11, 17)).getTime(),
    Date.UTC(2026, 10, 17),
  );
  assert.equal(
    toDate(plainDate(2026, 11, 17), "Asia/Ho_Chi_Minh").getTime(),
    Date.UTC(2026, 10, 16, 17),
  );
  const dateTime = plainDateTime(plainDate(2026, 7, 4), plainTime(12, 0));
  assert.equal(
    toDate(dateTime, "America/New_York").getTime(),
    Date.UTC(2026, 6, 4, 16),
  );
  assert.equal(
    toDate(toZoned(dateTime, "Asia/Tokyo"), "UTC").getTime(),
    Date.UTC(2026, 6, 4, 3),
  );
});

test("DateInput and TimeInput", () => {
  assert.deepEqual(toPlainDate("2026-11-17"), plainDate(2026, 11, 17));
  assert.deepEqual(
    toPlainDate(plainDate(2026, 11, 17)),
    plainDate(2026, 11, 17),
  );
  assert.deepEqual(toPlainTime("07:30"), plainTime(7, 30));
  assert.deepEqual(toPlainTime(plainTime(7, 30)), plainTime(7, 30));
  assert.throws(() => toPlainDate("17/11/2026"), RangeError);
});

test("Temporal-like duck typing", () => {
  assert.deepEqual(
    fromTemporalLike({ year: 2026, month: 11, day: 17, calendarId: "iso8601" }),
    plainDate(2026, 11, 17),
  );
  assert.deepEqual(
    fromTemporalLike({ hour: 7, minute: 5, second: 3 }),
    plainTime(7, 5, 3),
  );
  assert.deepEqual(
    fromTemporalLike({ year: 2026, month: 11, day: 17, hour: 7, minute: 5 }),
    plainDateTime(plainDate(2026, 11, 17), plainTime(7, 5)),
  );
  const zoned = fromTemporalLike({
    year: 2026,
    month: 7,
    day: 4,
    hour: 12,
    minute: 0,
    second: 0,
    timeZoneId: "America/New_York",
    offsetNanoseconds: -4 * 3600e9,
  });
  assert.deepEqual(
    zoned,
    toZoned(
      plainDateTime(plainDate(2026, 7, 4), plainTime(12, 0)),
      "America/New_York",
    ),
  );
  const computed = fromTemporalLike({
    year: 2026,
    month: 1,
    day: 4,
    hour: 12,
    minute: 0,
    timeZoneId: "America/New_York",
  }) as { offset: number };
  assert.equal(computed.offset, -300);
  assert.throws(
    () =>
      fromTemporalLike({ year: 2026, month: 1, day: 1, calendarId: "hebrew" }),
    RangeError,
  );
  assert.throws(() => fromTemporalLike({}), TypeError);
});
