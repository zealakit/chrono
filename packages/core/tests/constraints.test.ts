import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkDateRange,
  checkTimeRange,
  createAvailability,
  dayOfWeek,
  fromEpochDay,
  getDateStatus,
  getTimeStatus,
  isDateSelectable,
  plainDate,
  plainTime,
  snapTime,
  toEpochDay,
  type DayOfWeek,
  type PlainDate,
} from "../dist/foundation/index.js";

const d = (y: number, m: number, day: number) => plainDate(y, m, day);

test("date status order and reasons", () => {
  const c = {
    min: d(2026, 5, 10),
    max: d(2026, 5, 20),
    isDateDisabled: (x: PlainDate) => x.day === 15,
    isDateUnavailable: (x: PlainDate) => x.day === 15 || x.day === 16,
  };
  assert.deepEqual(getDateStatus(d(2026, 5, 9), c), {
    selectable: false,
    disabled: true,
    unavailable: false,
    reason: "before-min",
  });
  assert.equal(getDateStatus(d(2026, 5, 21), c).reason, "after-max");
  // Disabled wins over unavailable.
  assert.deepEqual(getDateStatus(d(2026, 5, 15), c), {
    selectable: false,
    disabled: true,
    unavailable: false,
    reason: "disabled",
  });
  assert.deepEqual(getDateStatus(d(2026, 5, 16), c), {
    selectable: false,
    disabled: false,
    unavailable: true,
    reason: "unavailable",
  });
  assert.deepEqual(getDateStatus(d(2026, 5, 12), c), {
    selectable: true,
    disabled: false,
    unavailable: false,
  });
  assert.equal(isDateSelectable(d(2026, 5, 12), c), true);
  assert.equal(isDateSelectable(d(2026, 5, 16), c), false);
  assert.equal(getDateStatus(d(2026, 5, 16)).selectable, true);
});

test("checkDateRange reports every reason", () => {
  const c = {
    min: d(2026, 5, 1),
    max: d(2026, 5, 31),
    isDateDisabled: (x: PlainDate) => x.day === 12,
    isDateUnavailable: (x: PlainDate) => x.day === 20 || x.day === 25,
  };
  const check = (a: number, b: number, extra = {}) =>
    checkDateRange(
      { start: d(2026, 5, a), end: d(2026, 5, b) },
      { ...c, ...extra },
    );
  assert.deepEqual(check(3, 6), { valid: true });
  assert.deepEqual(check(12, 14), { valid: false, reason: "start-invalid" });
  assert.deepEqual(check(10, 20), { valid: false, reason: "end-invalid" });
  assert.deepEqual(check(10, 14), {
    valid: false,
    reason: "contains-disabled",
  });
  assert.deepEqual(check(10, 14, { allowDisabledInside: true }), {
    valid: true,
  });
  assert.deepEqual(check(18, 22), {
    valid: false,
    reason: "contains-unavailable",
  });
  assert.deepEqual(check(18, 22, { allowUnavailableInside: true }), {
    valid: true,
  });
  assert.deepEqual(check(3, 4, { minDays: 3 }), {
    valid: false,
    reason: "too-short",
  });
  assert.deepEqual(check(3, 9, { maxDays: 3 }), {
    valid: false,
    reason: "too-long",
  });
  assert.deepEqual(check(3, 5, { minDays: 3, maxDays: 3 }), { valid: true });
  // availability feeds the unavailable scan
  const availability = createAvailability({
    mode: "blocked",
    dates: [d(2026, 5, 7)],
  });
  assert.deepEqual(check(6, 8, { availability }), {
    valid: false,
    reason: "contains-unavailable",
  });
});

test("time status, step and snapping", () => {
  const c = {
    min: plainTime(8, 0),
    max: plainTime(18, 0),
    step: { minutes: 15 },
    disabledRanges: [{ start: plainTime(12, 0), end: plainTime(13, 0) }],
    isTimeDisabled: (t: { hour: number; minute: number }) =>
      t.hour === 16 && t.minute === 30,
  };
  assert.equal(getTimeStatus(plainTime(7, 45), c).reason, "before-min");
  assert.equal(getTimeStatus(plainTime(18, 15), c).reason, "after-max");
  assert.equal(getTimeStatus(plainTime(9, 10), c).reason, "off-step");
  assert.equal(getTimeStatus(plainTime(12, 30), c).reason, "disabled-range");
  assert.equal(getTimeStatus(plainTime(13, 0), c).selectable, true); // half-open
  assert.equal(getTimeStatus(plainTime(16, 30), c).reason, "disabled");
  assert.deepEqual(getTimeStatus(plainTime(9, 15), c), { selectable: true });

  const step = { minutes: 15 };
  assert.deepEqual(snapTime(plainTime(9, 7), step, "floor"), plainTime(9, 0));
  assert.deepEqual(snapTime(plainTime(9, 7), step, "ceil"), plainTime(9, 15));
  assert.deepEqual(snapTime(plainTime(9, 7), step, "nearest"), plainTime(9, 0));
  assert.deepEqual(
    snapTime(plainTime(9, 8), step, "nearest"),
    plainTime(9, 15),
  );
  assert.deepEqual(snapTime(plainTime(9, 15), step, "ceil"), plainTime(9, 15));
  assert.deepEqual(
    snapTime(plainTime(23, 59), step, "ceil"),
    plainTime(23, 45),
  );
  assert.deepEqual(
    snapTime(plainTime(10, 0, 20), { seconds: 30 }, "floor"),
    plainTime(10, 0, 0),
  );
  assert.deepEqual(
    snapTime(plainTime(10, 0, 20), {}, "floor"),
    plainTime(10, 0, 20),
  );
});

test("checkTimeRange", () => {
  const range = (a: [number, number], b: [number, number]) => ({
    start: plainTime(...a),
    end: plainTime(...b),
  });
  const c = {
    min: plainTime(8, 0),
    max: plainTime(20, 0),
    minDuration: 1800,
    maxDuration: 7200,
  };
  assert.deepEqual(checkTimeRange(range([9, 0], [10, 0]), c), { valid: true });
  assert.deepEqual(checkTimeRange(range([7, 0], [10, 0]), c), {
    valid: false,
    reason: "start-invalid",
  });
  assert.deepEqual(checkTimeRange(range([9, 0], [21, 0]), c), {
    valid: false,
    reason: "end-invalid",
  });
  assert.deepEqual(checkTimeRange(range([9, 0], [9, 10]), c), {
    valid: false,
    reason: "too-short",
  });
  assert.deepEqual(checkTimeRange(range([9, 0], [12, 0]), c), {
    valid: false,
    reason: "too-long",
  });
  assert.deepEqual(checkTimeRange(range([22, 0], [2, 0])), {
    valid: false,
    reason: "overnight",
  });
  assert.deepEqual(
    checkTimeRange(range([22, 0], [2, 0]), {
      allowOvernight: true,
      maxDuration: 4 * 3600,
    }),
    { valid: true },
  );
  assert.deepEqual(
    checkTimeRange(range([22, 0], [2, 0]), {
      allowOvernight: true,
      maxDuration: 3 * 3600,
    }),
    { valid: false, reason: "too-long" },
  );
});

// Seeded generator (mulberry32): no library, same data every run.
function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("createAvailability matches a brute-force day loop on random data", () => {
  const random = rng(20261117);
  const base = toEpochDay(d(2026, 1, 1));
  const at = (offset: number) => fromEpochDay(base + offset);
  for (let round = 0; round < 60; round += 1) {
    const mode = round % 2 === 0 ? "available" : "blocked";
    const dates = Array.from({ length: Math.floor(random() * 8) }, () =>
      at(Math.floor(random() * 120)),
    );
    const ranges = Array.from({ length: Math.floor(random() * 4) }, () => {
      const start = Math.floor(random() * 120);
      return { start: at(start), end: at(start + Math.floor(random() * 15)) };
    });
    const weekdays = Array.from(
      { length: Math.floor(random() * 3) },
      () => (1 + Math.floor(random() * 7)) as DayOfWeek,
    );
    const availability = createAvailability({ mode, dates, ranges, weekdays });

    const listed = (day: PlainDate): boolean =>
      dates.some((x) => toEpochDay(x) === toEpochDay(day)) ||
      ranges.some(
        (r) =>
          toEpochDay(r.start) <= toEpochDay(day) &&
          toEpochDay(day) <= toEpochDay(r.end),
      ) ||
      weekdays.includes(dayOfWeek(day));
    const expected = (day: PlainDate): boolean =>
      mode === "blocked" ? !listed(day) : listed(day);

    for (let offset = -10; offset < 150; offset += 1) {
      const day = at(offset);
      assert.equal(
        availability.isAvailable(day),
        expected(day),
        `round ${round} ${mode} offset ${offset}`,
      );
    }
    for (let offset = -5; offset < 140; offset += 7) {
      for (const direction of [1, -1] as const) {
        let found: PlainDate | null = null;
        for (let step = 1; step <= 600; step += 1) {
          const candidate = fromEpochDay(base + offset + step * direction);
          if (expected(candidate)) {
            found = candidate;
            break;
          }
        }
        const actual = availability.nextAvailable(at(offset), direction);
        assert.equal(
          actual === null ? null : toEpochDay(actual),
          found === null ? null : toEpochDay(found),
          `round ${round} ${mode} offset ${offset} dir ${direction}`,
        );
      }
    }
  }
});

test("availability edge cases", () => {
  const none = createAvailability({ mode: "available" });
  assert.equal(none.isAvailable(d(2026, 5, 1)), false);
  assert.equal(none.nextAvailable(d(2026, 5, 1), 1), null);
  const everyDayBlocked = createAvailability({
    mode: "blocked",
    weekdays: [1, 2, 3, 4, 5, 6, 7],
  });
  assert.equal(everyDayBlocked.nextAvailable(d(2026, 5, 1), 1), null);
  const weekends = createAvailability({ mode: "blocked", weekdays: [6, 7] });
  assert.deepEqual(weekends.nextAvailable(d(2026, 5, 8), 1), d(2026, 5, 11)); // Fri -> Mon
  assert.deepEqual(weekends.nextAvailable(d(2026, 5, 11), -1), d(2026, 5, 8));
  const edge = createAvailability({
    mode: "blocked",
    ranges: [{ start: d(1, 1, 1), end: d(1, 1, 31) }],
  });
  assert.equal(edge.nextAvailable(d(1, 1, 31), -1), null);
});
