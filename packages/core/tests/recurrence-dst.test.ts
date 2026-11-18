import assert from "node:assert/strict";
import { test } from "node:test";
import { expandRecurrence } from "../dist/calendar/index.js";
import {
  parseIsoDate,
  parseIsoDateTime,
  toInstant,
  toZoned,
} from "../dist/foundation/index.js";

const range = {
  start: parseIsoDate("2026-01-01"),
  end: parseIsoDate("2026-12-31"),
};

test("a weekly 09:00 series keeps 09:00 across New York DST changes", () => {
  const zone = "America/New_York";
  const occurrences = expandRecurrence(
    {
      id: "z",
      start: toZoned(parseIsoDateTime("2026-03-01T09:00:00"), zone),
      end: toZoned(parseIsoDateTime("2026-03-01T10:00:00"), zone),
      rrule: "FREQ=WEEKLY;COUNT=4",
    },
    range,
    { timeZone: zone },
  );
  assert.deepEqual(
    occurrences.map((occurrence) => [
      occurrence.start.month,
      occurrence.start.day,
      occurrence.start.hour,
    ]),
    [
      [3, 1, 9],
      [3, 8, 9],
      [3, 15, 9],
      [3, 22, 9],
    ],
  );
  const before = toZoned(occurrences[0]?.start as never, zone);
  const after = toZoned(occurrences[1]?.start as never, zone);
  assert.equal(after.offset, before.offset + 60);
  assert.equal((toInstant(after) - toInstant(before)) / 3_600_000, 7 * 24 - 1);
});

test("a series in the spring-forward gap follows compatible disambiguation", () => {
  const zone = "America/New_York";
  const occurrences = expandRecurrence(
    {
      id: "gap",
      start: toZoned(parseIsoDateTime("2026-03-01T02:30:00"), zone),
      end: toZoned(parseIsoDateTime("2026-03-01T03:30:00"), zone),
      rrule: "FREQ=WEEKLY;COUNT=2",
    },
    range,
    { timeZone: zone },
  );
  assert.equal(occurrences[0]?.start.hour, 2);
  assert.equal(occurrences[1]?.start.hour, 3);
  assert.equal(occurrences[1]?.start.minute, 30);
});

test("a weekly series keeps 09:00 across Lord Howe's 30-minute shift", () => {
  const zone = "Australia/Lord_Howe";
  const occurrences = expandRecurrence(
    {
      id: "lh",
      start: toZoned(parseIsoDateTime("2026-09-28T09:00:00"), zone),
      end: toZoned(parseIsoDateTime("2026-09-28T10:00:00"), zone),
      rrule: "FREQ=WEEKLY;COUNT=3",
    },
    range,
    { timeZone: zone },
  );
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.start.hour),
    [9, 9, 9],
  );
});
