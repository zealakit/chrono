import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseIsoDate,
  parseIsoDateTime,
  parseIsoTime,
  parseIsoZoned,
  plainDate,
  plainDateTime,
  plainTime,
  toIsoString,
  toZoned,
} from "../dist/foundation/index.js";

test("valid forms", () => {
  assert.deepEqual(parseIsoDate("2026-11-17"), plainDate(2026, 11, 17));
  assert.deepEqual(parseIsoDate("0001-01-01"), plainDate(1, 1, 1));
  assert.deepEqual(parseIsoTime("08:05"), plainTime(8, 5, 0));
  assert.deepEqual(parseIsoTime("08:05:09"), plainTime(8, 5, 9));
  assert.deepEqual(parseIsoTime("08:05:09.987"), plainTime(8, 5, 9));
  assert.deepEqual(
    parseIsoDateTime("2026-11-17T08:05"),
    plainDateTime(plainDate(2026, 11, 17), plainTime(8, 5)),
  );
});

test("invalid forms are rejected", () => {
  for (const text of [
    "2026-11-31",
    "2026-13-01",
    "26-11-17",
    "2026/11/17",
    "2026-11-17T",
    " 2026-11-17",
    "",
    "tomorrow",
    "2026-02-29",
  ]) {
    assert.throws(() => parseIsoDate(text), RangeError, text);
  }
  for (const text of [
    "24:00",
    "8:05",
    "08:60",
    "08:05:60",
    "08-05",
    "08:05pm",
  ]) {
    assert.throws(() => parseIsoTime(text), RangeError, text);
  }
  for (const text of ["2026-11-17 08:05", "2026-11-17T25:00", "2026-11-17"]) {
    assert.throws(() => parseIsoDateTime(text), RangeError, text);
  }
  for (const text of [
    "2026-11-17T08:05",
    "2026-11-17T08:05+0100",
    "2026-11-17T08:05+25:00",
    "2026-11-17T08:05Z[Nope/Zone]",
  ]) {
    assert.throws(() => parseIsoZoned(text), RangeError, text);
  }
});

test("zoned: offsets, Z and [Zone/Id]", () => {
  const z = parseIsoZoned("2026-11-17T08:05:00+07:00[Asia/Ho_Chi_Minh]");
  assert.deepEqual(
    [z.timeZone, z.offset, z.hour],
    ["Asia/Ho_Chi_Minh", 420, 8],
  );
  const utc = parseIsoZoned("2026-11-17T08:05Z");
  assert.deepEqual([utc.timeZone, utc.offset], ["UTC", 0]);
  const fixed = parseIsoZoned("2026-11-17T08:05:00-03:30");
  assert.deepEqual([fixed.timeZone, fixed.offset], ["-03:30", -210]);
  // The offset must match the zone at that instant.
  assert.throws(
    () => parseIsoZoned("2026-07-01T12:00:00-05:00[America/New_York]"),
    RangeError,
  );
  assert.equal(
    parseIsoZoned("2026-07-01T12:00:00-04:00[America/New_York]").offset,
    -240,
  );
  // The offset disambiguates a repeated hour.
  assert.equal(
    parseIsoZoned("2026-11-01T01:30:00-05:00[America/New_York]").offset,
    -300,
  );
  assert.equal(
    parseIsoZoned("2026-11-01T01:30:00-04:00[America/New_York]").offset,
    -240,
  );
});

test("parse(toIsoString(x)) = x", () => {
  const date = plainDate(2026, 3, 5);
  assert.equal(toIsoString(date), "2026-03-05");
  assert.deepEqual(parseIsoDate(toIsoString(date)), date);
  assert.equal(toIsoString(plainDate(7, 1, 1)), "0007-01-01");
  const time = plainTime(9, 8, 7);
  assert.equal(toIsoString(time), "09:08:07");
  assert.deepEqual(parseIsoTime(toIsoString(time)), time);
  const dateTime = plainDateTime(date, time);
  assert.equal(toIsoString(dateTime), "2026-03-05T09:08:07");
  assert.deepEqual(parseIsoDateTime(toIsoString(dateTime)), dateTime);
  for (const zone of [
    "Asia/Ho_Chi_Minh",
    "America/New_York",
    "Australia/Lord_Howe",
    "UTC",
    "+05:45",
  ]) {
    const zoned = toZoned(dateTime, zone);
    assert.deepEqual(parseIsoZoned(toIsoString(zoned)), zoned, zone);
  }
  assert.equal(
    toIsoString(toZoned(dateTime, "Australia/Lord_Howe")),
    "2026-03-05T09:08:07+11:00[Australia/Lord_Howe]",
  );
});
