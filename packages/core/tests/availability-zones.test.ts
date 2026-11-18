import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAvailability,
  plainDate,
  plainDateTime,
  plainTime,
  type PlainDate,
} from "../dist/foundation/index.js";

const d = (year: number, month: number, day: number): PlainDate =>
  plainDate(year, month, day);
const t = (hour: number, minute = 0) => plainTime(hour, minute);

const startOf = (piece: { start: number } | undefined): number => {
  assert.ok(piece);
  return piece.start;
};
const endOf = (piece: { end: number } | undefined): number => {
  assert.ok(piece);
  return piece.end;
};

const dayRange = (day: PlainDate) =>
  [
    plainDateTime(day, t(0)),
    plainDateTime(plainDate(day.year, day.month, day.day + 1), t(0)),
  ] as const;

test("a spec in one zone is shifted for a viewer in another", () => {
  // 22:00–02:00 in Ho Chi Minh is 10:00–14:00 in New York (UTC-5) in November.
  const availability = createAvailability(
    {
      timeZone: "Asia/Ho_Chi_Minh",
      open: [{ type: "daily", start: "22:00", end: "02:00" }],
    },
    { timeZone: "America/New_York" },
  );
  const [from, to] = dayRange(d(2026, 11, 16));
  const available = availability
    .getIntervals(from, to)
    .filter((piece) => piece.status === "available");
  assert.equal(available.length, 1);
  // 10:00 and 14:00 New York (UTC-5) are 15:00 and 19:00 UTC.
  assert.equal(startOf(available[0]), Date.UTC(2026, 10, 16, 15, 0));
  assert.equal(endOf(available[0]), Date.UTC(2026, 10, 16, 19, 0));
});

test("the same spec gives matching day statuses in the spec zone", () => {
  const availability = createAvailability({
    timeZone: "Asia/Ho_Chi_Minh",
    open: [{ type: "daily", start: "09:00", end: "17:00" }],
  });
  assert.equal(availability.getDayStatus(d(2026, 11, 16)), "available");
});

test("a rule starting inside a DST gap starts at the gap end", () => {
  // New York, 2026-03-08: 02:00–03:00 does not exist; the gap ends at 03:00 EDT.
  const availability = createAvailability(
    {
      timeZone: "America/New_York",
      blocked: [
        { type: "range", start: "2026-03-08T02:00", end: "2026-03-08T03:30" },
      ],
    },
    { timeZone: "America/New_York" },
  );
  const [from, to] = dayRange(d(2026, 3, 8));
  const blocked = availability
    .getIntervals(from, to)
    .filter((piece) => piece.status === "unavailable");
  assert.equal(blocked.length, 1);
  assert.equal(startOf(blocked[0]), Date.UTC(2026, 2, 8, 7, 0));
  assert.equal(endOf(blocked[0]), Date.UTC(2026, 2, 8, 7, 30));
});

test("a daily rule inside a Lord Howe gap keeps only the real minutes", () => {
  // Lord Howe shifts by 30 minutes on 2026-10-04: 02:00 becomes 02:30.
  const availability = createAvailability({
    timeZone: "Australia/Lord_Howe",
    open: [{ type: "daily", start: "02:00", end: "03:00" }],
  });
  const [from, to] = dayRange(d(2026, 10, 4));
  const available = availability
    .getIntervals(from, to)
    .filter((piece) => piece.status === "available");
  assert.equal(available.length, 1);
  assert.equal(endOf(available[0]) - startOf(available[0]), 30 * 60_000);
});
