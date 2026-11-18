import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addBusinessDays,
  countBusinessDays,
  createAvailability,
  plainDate,
  plainTime,
  type PlainDate,
} from "../dist/foundation/index.js";

const d = (year: number, month: number, day: number): PlainDate =>
  plainDate(year, month, day);
const t = (hour: number, minute = 0) => plainTime(hour, minute);

const weekends = [{ type: "weekly", days: [6, 7] }] as const;

test("leadTime minutes and hours push the first available instant", () => {
  const now = Date.UTC(2026, 10, 20, 13, 0); // Fri 13:00 UTC
  const minutes = createAvailability(
    { timeZone: "UTC", leadTime: { minutes: 90 } },
    { now },
  );
  assert.equal(minutes.isTimeAvailable(d(2026, 11, 20), t(14, 29)), false);
  assert.equal(minutes.isTimeAvailable(d(2026, 11, 20), t(14, 30)), true);

  const hours = createAvailability(
    { timeZone: "UTC", leadTime: { hours: 2 } },
    { now },
  );
  assert.equal(hours.isTimeAvailable(d(2026, 11, 20), t(14, 59)), false);
  assert.equal(hours.isTimeAvailable(d(2026, 11, 20), t(15, 0)), true);
});

test("leadTime days start at midnight of today + n", () => {
  const now = Date.UTC(2026, 10, 20, 13, 0);
  const availability = createAvailability(
    { timeZone: "UTC", leadTime: { days: 2 } },
    { now },
  );
  assert.equal(availability.getDayStatus(d(2026, 11, 21)), "unavailable");
  assert.equal(availability.getDayStatus(d(2026, 11, 22)), "available");
});

test("leadTime businessDays honours cutoffTime (the plan's example)", () => {
  const before = createAvailability(
    {
      timeZone: "UTC",
      blocked: weekends,
      leadTime: { businessDays: 2 },
      cutoffTime: "14:00",
    },
    { now: Date.UTC(2026, 10, 20, 13, 0) }, // Fri 13:00
  );
  assert.equal(before.getDayStatus(d(2026, 11, 23)), "unavailable");
  assert.equal(before.getDayStatus(d(2026, 11, 24)), "available");

  const after = createAvailability(
    {
      timeZone: "UTC",
      blocked: weekends,
      leadTime: { businessDays: 2 },
      cutoffTime: "14:00",
    },
    { now: Date.UTC(2026, 10, 20, 15, 0) }, // Fri 15:00, past cutoff
  );
  assert.equal(after.getDayStatus(d(2026, 11, 24)), "unavailable");
  assert.equal(after.getDayStatus(d(2026, 11, 25)), "available");

  const saturday = createAvailability(
    {
      timeZone: "UTC",
      blocked: weekends,
      leadTime: { businessDays: 2 },
      cutoffTime: "14:00",
    },
    { now: Date.UTC(2026, 10, 21, 10, 0) }, // Sat
  );
  assert.equal(saturday.getDayStatus(d(2026, 11, 25)), "available");
});

test("bookingWindow caps the last available day", () => {
  const now = Date.UTC(2026, 10, 20, 9, 0); // Fri Nov 20 09:00 UTC
  const days = createAvailability(
    { timeZone: "UTC", bookingWindow: { days: 1 } },
    { now },
  );
  assert.equal(days.getDayStatus(d(2026, 11, 21)), "available");
  assert.equal(days.getDayStatus(d(2026, 11, 22)), "unavailable");

  const months = createAvailability(
    { timeZone: "UTC", bookingWindow: { months: 1 } },
    { now },
  );
  assert.equal(months.getDayStatus(d(2026, 12, 20)), "available");
  assert.equal(months.getDayStatus(d(2026, 12, 21)), "unavailable");
});

test("lead time uses the spec zone near midnight", () => {
  // 23:30 in Ho Chi Minh is 16:30 UTC the same day.
  const now = Date.UTC(2026, 10, 20, 16, 30);
  const availability = createAvailability(
    { timeZone: "Asia/Ho_Chi_Minh", leadTime: { days: 1 } },
    { now },
  );
  assert.equal(availability.isTimeAvailable(d(2026, 11, 20), t(23, 45)), false);
  assert.equal(availability.isTimeAvailable(d(2026, 11, 21), t(0, 30)), true);
});

test("business-day helpers match a naive walk", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    blocked: [
      { type: "weekly", days: [6, 7] },
      { type: "dates", dates: ["2026-12-25"] },
    ],
  });
  const addDaysLocal = (date: PlainDate, days: number): PlainDate => {
    const at = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
    return d(at.getUTCFullYear(), at.getUTCMonth() + 1, at.getUTCDate());
  };
  const naive = (date: PlainDate, count: number, direction: 1 | -1) => {
    let day = date;
    let remaining = Math.abs(count);
    while (remaining > 0) {
      day = addDaysLocal(day, direction);
      if (availability.getDayStatus(day) !== "unavailable") remaining -= 1;
    }
    return day;
  };

  for (let offset = 0; offset < 200; offset += 11) {
    const start = addDaysLocal(d(2026, 11, 1), offset);
    for (const count of [1, 3, 10]) {
      assert.deepEqual(
        addBusinessDays(start, count, availability),
        naive(start, count, 1),
        `+${count} from ${JSON.stringify(start)}`,
      );
      assert.deepEqual(
        addBusinessDays(start, -count, availability),
        naive(start, count, -1),
        `-${count} from ${JSON.stringify(start)}`,
      );
    }
  }
  assert.equal(
    countBusinessDays(
      { start: d(2026, 11, 16), end: d(2026, 11, 22) },
      availability,
    ),
    5,
  );
});

test("lead time is skipped when no now is given", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    leadTime: { days: 3 },
  });
  assert.equal(availability.getDayStatus(d(2026, 11, 16)), "available");
});
