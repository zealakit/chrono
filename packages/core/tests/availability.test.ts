import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addBusinessDays,
  countBusinessDays,
  createAvailability,
  getAvailabilityLabel,
  isBusinessDay,
  plainDate,
  plainDateTime,
  plainTime,
  type PlainDate,
} from "../dist/foundation/index.js";

const d = (year: number, month: number, day: number): PlainDate =>
  plainDate(year, month, day);
const t = (hour: number, minute = 0) => plainTime(hour, minute);

test("the plan's worked fixtures: open hours, lunch, weekends", () => {
  const availability = createAvailability({
    timeZone: "Asia/Ho_Chi_Minh",
    open: [
      { type: "weekly", days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
    ],
    blocked: [{ type: "daily", start: "12:00", end: "13:00", reason: "Lunch" }],
  });

  const monday = d(2026, 11, 16);
  const pieces = availability.getIntervals(
    plainDateTime(monday, t(0)),
    plainDateTime(d(2026, 11, 17), t(0)),
  );
  assert.deepEqual(
    pieces.map((piece) => [
      piece.status,
      piece.rules.map((rule) => rule.reason),
    ]),
    [
      ["unavailable", []],
      ["available", []],
      ["unavailable", ["Lunch"]],
      ["available", []],
      ["unavailable", []],
    ],
  );
  assert.equal(availability.getDayStatus(monday), "partial");
  assert.equal(availability.getDayStatus(d(2026, 11, 21)), "unavailable");
});

test("open without blocked: weekdays available, weekend unavailable", () => {
  const availability = createAvailability({
    timeZone: "Asia/Ho_Chi_Minh",
    open: [
      { type: "weekly", days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
    ],
  });
  assert.equal(availability.getDayStatus(d(2026, 11, 16)), "available");
  assert.equal(availability.getDayStatus(d(2026, 11, 21)), "unavailable");
});

test("blocked wins over open", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    open: [{ type: "daily", start: "09:00", end: "17:00" }],
    blocked: [
      { type: "range", start: "2026-11-16T10:00", end: "2026-11-16T11:00" },
    ],
  });
  assert.equal(availability.isTimeAvailable(d(2026, 11, 16), t(10, 30)), false);
  assert.equal(availability.isTimeAvailable(d(2026, 11, 16), t(9, 30)), true);
  assert.equal(availability.isTimeAvailable(d(2026, 11, 16), t(11, 30)), true);
});

test("blocked only: everything else is available", () => {
  const availability = createAvailability({
    timeZone: "Asia/Ho_Chi_Minh",
    blocked: [{ type: "dates", dates: ["2026-11-20"] }],
  });
  assert.equal(availability.getDayStatus(d(2026, 11, 20)), "unavailable");
  assert.equal(availability.getDayStatus(d(2026, 11, 21)), "available");
});

test("daily rules cross midnight", () => {
  const availability = createAvailability({
    timeZone: "Asia/Ho_Chi_Minh",
    open: [{ type: "daily", start: "22:00", end: "02:00" }],
  });
  assert.equal(availability.isTimeAvailable(d(2026, 11, 17), t(22, 30)), true);
  assert.equal(availability.isTimeAvailable(d(2026, 11, 18), t(1, 30)), true);
  assert.equal(availability.isTimeAvailable(d(2026, 11, 18), t(2, 0)), false);
  assert.equal(availability.isTimeAvailable(d(2026, 11, 18), t(2, 1)), false);
});

test("weekly rules with days and an empty rule list", () => {
  const onlyMondays = createAvailability({
    timeZone: "UTC",
    open: [{ type: "weekly", days: [1] }],
  });
  assert.equal(onlyMondays.getDayStatus(d(2026, 11, 16)), "available");
  assert.equal(onlyMondays.getDayStatus(d(2026, 11, 17)), "unavailable");

  // `open: []` means "nothing is open", unlike omitting `open` entirely.
  const nothing = createAvailability({ open: [] });
  assert.equal(nothing.getDayStatus(d(2026, 11, 16)), "unavailable");
  assert.equal(nothing.isAvailable(d(2026, 11, 16)), false);
  const everything = createAvailability({ blocked: [] });
  assert.equal(everything.getDayStatus(d(2026, 11, 16)), "available");
});

test("rules filter by resource, and rules without one apply to all", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    open: [
      {
        type: "weekly",
        days: [1],
        start: "09:00",
        end: "17:00",
        resourceId: "room-a",
      },
      {
        type: "weekly",
        days: [1],
        start: "10:00",
        end: "12:00",
        resourceId: ["room-b"],
      },
    ],
  });
  assert.equal(
    availability.isTimeAvailable(d(2026, 11, 16), t(9, 30), "room-a"),
    true,
  );
  assert.equal(
    availability.isTimeAvailable(d(2026, 11, 16), t(9, 30), "room-b"),
    false,
  );
  assert.equal(
    availability.isTimeAvailable(d(2026, 11, 16), t(11), "room-b"),
    true,
  );
});

test("isRangeAvailable and getDayStatus agree", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    open: [{ type: "daily", start: "09:00", end: "17:00" }],
    blocked: [{ type: "daily", start: "12:00", end: "13:00" }],
  });
  const at = (hour: number, minute = 0) =>
    plainDateTime(d(2026, 11, 16), t(hour, minute));
  assert.equal(availability.isRangeAvailable(at(9), at(12)), true);
  assert.equal(availability.isRangeAvailable(at(9), at(13)), false);
  assert.equal(availability.isRangeAvailable(at(12, 30), at(12, 45)), false);
});

test("nextAvailable skips fully unavailable days", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    blocked: [{ type: "weekly", days: [6, 7] }],
  });
  assert.deepEqual(
    availability.nextAvailable(d(2026, 11, 20), 1),
    d(2026, 11, 23),
  );
  assert.deepEqual(
    availability.nextAvailable(d(2026, 11, 23), -1),
    d(2026, 11, 20),
  );
});

test("business-day helpers use day status", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    blocked: [{ type: "weekly", days: [6, 7] }],
  });
  assert.equal(isBusinessDay(d(2026, 11, 16), availability), true);
  assert.equal(isBusinessDay(d(2026, 11, 21), availability), false);
  assert.deepEqual(
    addBusinessDays(d(2026, 11, 20), 2, availability),
    d(2026, 11, 24),
  );
  assert.deepEqual(
    addBusinessDays(d(2026, 11, 24), -2, availability),
    d(2026, 11, 20),
  );
  assert.equal(
    countBusinessDays(
      { start: d(2026, 11, 16), end: d(2026, 11, 22) },
      availability,
    ),
    5,
  );
});

test("getAvailabilityLabel returns the first reason", () => {
  assert.equal(
    getAvailabilityLabel([
      { type: "daily", start: "00:00", end: "01:00", reason: "Closed" },
    ]),
    "Closed",
  );
  assert.equal(getAvailabilityLabel([]), "");
});

test("the legacy date-only shape keeps working (plan 11 R1)", () => {
  const blocked = createAvailability({ mode: "blocked", weekdays: [6, 7] });
  assert.equal(blocked.isAvailable(d(2026, 11, 20)), true);
  assert.equal(blocked.isAvailable(d(2026, 11, 21)), false);
  assert.deepEqual(blocked.nextAvailable(d(2026, 11, 20), 1), d(2026, 11, 23));

  const onlyDates = createAvailability({
    mode: "available",
    dates: [d(2026, 5, 7)],
  });
  assert.equal(onlyDates.isAvailable(d(2026, 5, 7)), true);
  assert.equal(onlyDates.isAvailable(d(2026, 5, 8)), false);

  const inclusive = createAvailability({
    mode: "blocked",
    ranges: [{ start: d(2026, 5, 4), end: d(2026, 5, 7) }],
  });
  assert.equal(inclusive.isAvailable(d(2026, 5, 7)), false);
  assert.equal(inclusive.isAvailable(d(2026, 5, 8)), true);
});
