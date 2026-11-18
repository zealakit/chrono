import assert from "node:assert/strict";
import { test } from "node:test";
import { expandRecurrence } from "../dist/calendar/index.js";
import {
  parseIsoDate,
  parseIsoDateTime,
  toIsoString,
  toZoned,
} from "../dist/foundation/index.js";

const range = {
  start: parseIsoDate("2026-01-01"),
  end: parseIsoDate("2026-12-31"),
};

const starts = (
  rrule: string,
  start: string,
  end: string,
  extra: Record<string, unknown> = {},
): string[] =>
  expandRecurrence({ id: "s", start, end, rrule, ...extra }, range, {
    timeZone: "UTC",
  }).map((occurrence) => toIsoString(occurrence.start));

test("INTERVAL steps days", () => {
  assert.deepEqual(
    starts(
      "FREQ=DAILY;INTERVAL=2;COUNT=4",
      "2026-01-01T09:00:00",
      "2026-01-01T10:00:00",
    ),
    [
      "2026-01-01T09:00:00",
      "2026-01-03T09:00:00",
      "2026-01-05T09:00:00",
      "2026-01-07T09:00:00",
    ],
  );
});

test("negative BYMONTHDAY resolves against the month length", () => {
  assert.deepEqual(
    starts(
      "FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=3",
      "2026-01-31T09:00:00",
      "2026-01-31T10:00:00",
    ),
    ["2026-01-31T09:00:00", "2026-02-28T09:00:00", "2026-03-31T09:00:00"],
  );
});

test("COUNT applies before EXDATE removal", () => {
  const occurrences = expandRecurrence(
    {
      id: "s",
      start: "2026-01-01T09:00:00",
      end: "2026-01-01T10:00:00",
      rrule: "FREQ=DAILY;COUNT=5",
      exdates: ["2026-01-03T09:00:00"],
    },
    range,
    { timeZone: "UTC" },
  );
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.start.day),
    [1, 2, 4, 5],
  );
});

test("RDATE adds occurrences that are not subject to COUNT", () => {
  const occurrences = expandRecurrence(
    {
      id: "s",
      start: "2026-01-01T09:00:00",
      end: "2026-01-01T10:00:00",
      rrule: "FREQ=WEEKLY;COUNT=2",
      rdates: ["2026-01-15T09:00:00"],
    },
    range,
    { timeZone: "UTC" },
  );
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.start.day),
    [1, 8, 15],
  );
});

test("UNTIL is inclusive; an UNTIL before DTSTART keeps only DTSTART", () => {
  assert.deepEqual(
    starts(
      "FREQ=DAILY;UNTIL=20260103T090000",
      "2026-01-01T09:00:00",
      "2026-01-01T10:00:00",
    ),
    ["2026-01-01T09:00:00", "2026-01-02T09:00:00", "2026-01-03T09:00:00"],
  );
  assert.deepEqual(
    starts(
      "FREQ=DAILY;UNTIL=20251231T090000",
      "2026-01-01T09:00:00",
      "2026-01-01T10:00:00",
    ),
    ["2026-01-01T09:00:00"],
  );
});

test("DTSTART counts even when it matches no BY rule", () => {
  assert.deepEqual(
    starts(
      "FREQ=MONTHLY;BYDAY=MO;COUNT=2",
      "2026-01-06T09:00:00",
      "2026-01-06T10:00:00",
    ),
    ["2026-01-06T09:00:00", "2026-01-12T09:00:00"],
  );
});

test("all-day series keep their day length", () => {
  const occurrences = expandRecurrence(
    {
      id: "a",
      start: "2026-01-01",
      end: "2026-01-03",
      rrule: "FREQ=WEEKLY;COUNT=2",
    },
    range,
    { timeZone: "UTC" },
  );
  assert.deepEqual(
    occurrences.map((occurrence) => [
      occurrence.start.day,
      occurrence.end.day,
      occurrence.allDay,
    ]),
    [
      [1, 3, true],
      [8, 10, true],
    ],
  );
});

test("a zoned series keeps DTSTART's wall time in its zone", () => {
  const zone = "America/New_York";
  const series = {
    id: "z",
    start: toZoned(parseIsoDateTime("2026-03-01T09:00:00"), zone),
    end: toZoned(parseIsoDateTime("2026-03-01T10:00:00"), zone),
    rrule: "FREQ=WEEKLY;COUNT=2",
  };
  const occurrences = expandRecurrence(series, range, { timeZone: zone });
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.start.hour),
    [9, 9],
  );
});

test("a daily series started decades ago still expands far in the future", () => {
  const occurrences = expandRecurrence(
    {
      id: "old",
      start: "1995-01-01T09:00:00",
      end: "1995-01-01T10:00:00",
      rrule: "FREQ=DAILY",
    },
    { start: parseIsoDate("2026-11-16"), end: parseIsoDate("2026-11-22") },
    { onError: (error: { code: string }) => assert.fail(error.code) },
  );
  assert.equal(occurrences.length, 7);
});
