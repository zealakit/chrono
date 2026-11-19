import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dayOfWeek,
  getDecadeGrid,
  getIsoWeek,
  getMonthGrid,
  getMonths,
  getTimeAxis,
  getWeekdayHeaders,
  getYearGrid,
  plainDate,
  plainTime,
  toEpochDay,
  type DayOfWeek,
} from "../dist/foundation/index.js";

const ALL: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];

test("month grids for all 7 weekStartsOn values", () => {
  for (const weekStartsOn of ALL) {
    for (const [year, month] of [
      [2026, 11],
      [2026, 2],
      [2024, 2],
      [2026, 3],
      [2027, 8],
    ] as const) {
      const grid = getMonthGrid(year, month, { weekStartsOn });
      const days = grid.weeks.flatMap((w) => w.days);
      assert.equal(days.length % 7, 0);
      for (const week of grid.weeks) {
        assert.equal(week.days[0]?.dayOfWeek, weekStartsOn);
        assert.equal(week.days.length, 7);
      }
      days.forEach((day, index) => {
        assert.equal(day.dayOfWeek, dayOfWeek(day.date));
        if (index > 0)
          assert.equal(
            toEpochDay(day.date),
            toEpochDay((days[index - 1] as typeof day).date) + 1,
          );
      });
      const inside = days.filter((day) => !day.outsideMonth);
      assert.equal(
        inside.length,
        new Date(Date.UTC(year, month, 0)).getUTCDate(),
      );
      assert.equal(inside[0]?.date.day, 1);
      // No more rows than needed.
      assert.ok(grid.weeks.length >= 4 && grid.weeks.length <= 6);
      assert.ok(
        (grid.weeks[grid.weeks.length - 1] as { days: typeof days }).days.some(
          (day) => !day.outsideMonth,
        ),
      );
    }
  }
});

test("February: 4 rows when it fits exactly, leap years add a day", () => {
  assert.equal(getMonthGrid(2026, 2, { weekStartsOn: 7 }).weeks.length, 4); // Feb 2026 starts on Sunday
  assert.equal(getMonthGrid(2026, 2, { weekStartsOn: 1 }).weeks.length, 5);
  const leap = getMonthGrid(2024, 2, { weekStartsOn: 1 })
    .weeks.flatMap((w) => w.days)
    .filter((x) => !x.outsideMonth);
  assert.equal(leap.length, 29);
});

test("fixedWeeks always gives 6 rows", () => {
  for (const [year, month] of [
    [2026, 2],
    [2026, 11],
    [2027, 5],
  ] as const) {
    assert.equal(
      getMonthGrid(year, month, { weekStartsOn: 1, fixedWeeks: true }).weeks
        .length,
      6,
    );
  }
  assert.equal(getMonthGrid(2026, 2, { weekStartsOn: 1 }).weeks.length, 5);
});

test("weekend, today and outside-month flags", () => {
  const grid = getMonthGrid(2026, 11, {
    weekStartsOn: 1,
    today: plainDate(2026, 11, 17),
  });
  const days = grid.weeks.flatMap((w) => w.days);
  assert.equal(days.filter((x) => x.today).length, 1);
  assert.equal(days.find((x) => x.today)?.date.day, 17);
  assert.deepEqual(
    [...new Set(days.filter((x) => x.weekend).map((x) => x.dayOfWeek))].sort(),
    [6, 7],
  );
  assert.equal(days[0]?.date.month, 10);
  assert.equal(days[0]?.outsideMonth, true);
  const custom = getMonthGrid(2026, 11, {
    weekStartsOn: 6,
    weekInfo: { weekend: [5, 6] },
  });
  assert.deepEqual(
    [
      ...new Set(
        custom.weeks
          .flatMap((w) => w.days)
          .filter((x) => x.weekend)
          .map((x) => x.dayOfWeek),
      ),
    ].sort(),
    [5, 6],
  );
  assert.equal(
    getMonthGrid(2026, 11, { weekStartsOn: 1 })
      .weeks.flatMap((w) => w.days)
      .some((x) => x.today),
    false,
  );
});

test("week numbers", () => {
  const iso = getMonthGrid(2026, 1, { weekStartsOn: 1 });
  assert.deepEqual(
    iso.weeks.map((w) => w.weekNumber),
    [1, 2, 3, 4, 5],
  );
  const dec = getMonthGrid(2026, 12, { weekStartsOn: 1 });
  assert.equal(dec.weeks[dec.weeks.length - 1]?.weekNumber, 53);
  // Sunday-start rows are named by their Thursday.
  const sunday = getMonthGrid(2026, 1, { weekStartsOn: 7 });
  for (const week of sunday.weeks) {
    const thursday = week.days.find((x) => x.dayOfWeek === 4);
    assert.equal(
      week.weekNumber,
      getIsoWeek((thursday as { date: ReturnType<typeof plainDate> }).date)
        .week,
    );
  }
  const locale = getMonthGrid(2026, 1, {
    weekStartsOn: 7,
    weekNumbers: "locale",
    weekInfo: { weekend: [6, 7], firstDay: 7, minimalDays: 1 },
  });
  assert.deepEqual(
    locale.weeks.map((w) => w.weekNumber),
    [1, 2, 3, 4, 5],
  );
});

test("multi-month grids are consecutive, including across years", () => {
  const months = getMonths({ year: 2026, month: 11 }, 4, { weekStartsOn: 1 });
  assert.deepEqual(
    months.map((m) => [m.year, m.month]),
    [
      [2026, 11],
      [2026, 12],
      [2027, 1],
      [2027, 2],
    ],
  );
  assert.deepEqual(
    getMonths(plainDate(2026, 1, 15), 0, { weekStartsOn: 1 }),
    [],
  );
});

test("year and decade grids", () => {
  const year = getYearGrid(2026);
  assert.equal(year.rows.length, 3);
  assert.deepEqual(
    year.rows.map((r) => r.length),
    [4, 4, 4],
  );
  assert.deepEqual(year.rows[2]?.[3], { year: 2026, month: 12 });
  assert.deepEqual(
    getYearGrid(2026, { columns: 3 }).rows.map((r) => r.length),
    [3, 3, 3, 3],
  );
  assert.throws(() => getYearGrid(2026, { columns: 0 }), RangeError);

  const decade = getDecadeGrid(2026);
  assert.equal(decade.years.length, 12);
  assert.equal(decade.years[0]?.year, 2019);
  assert.equal(decade.years[0]?.outsideDecade, true);
  assert.equal(decade.years[1]?.outsideDecade, false);
  assert.equal(decade.years[10]?.year, 2029);
  assert.equal(decade.years[11]?.outsideDecade, true);
  assert.equal(getDecadeGrid(5, { size: 12 }).years[0]?.year, 1);
  assert.equal(getDecadeGrid(1).years[0]?.year, 1);
  assert.equal(getDecadeGrid(9999).years.at(-1)?.year, 9999);
});

test("weekday headers", () => {
  const headers = getWeekdayHeaders("en-US", { weekStartsOn: 1 });
  assert.deepEqual(
    headers.map((h) => h.short),
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  );
  assert.equal(headers[0]?.long, "Monday");
  assert.deepEqual(
    headers.filter((h) => h.weekend).map((h) => h.dayOfWeek),
    [6, 7],
  );
  const work = getWeekdayHeaders("en-US", {
    weekStartsOn: 1,
    hiddenDays: [6, 7],
  });
  assert.deepEqual(
    work.map((h) => h.dayOfWeek),
    [1, 2, 3, 4, 5],
  );
  assert.equal(
    getWeekdayHeaders("en-US", { weekStartsOn: 7, width: "narrow" })[0]?.short,
    "S",
  );
  assert.equal(
    getWeekdayHeaders("en-US", { weekStartsOn: 7 })[0]?.dayOfWeek,
    7,
  );
});

test("time axis with step 15 / 30 / 60 and working hours", () => {
  assert.equal(getTimeAxis({ step: { minutes: 60 } }).length, 24);
  assert.equal(getTimeAxis({ step: { minutes: 30 } }).length, 48);
  assert.equal(getTimeAxis({ step: { minutes: 15 } }).length, 96);
  const slots = getTimeAxis({
    start: plainTime(8, 0),
    end: plainTime(18, 0),
    step: { minutes: 30 },
    workingHours: [{ start: plainTime(9, 0), end: plainTime(17, 0) }],
  });
  assert.equal(slots.length, 20);
  assert.deepEqual(slots[0]?.start, plainTime(8, 0));
  assert.equal(slots[0]?.working, false);
  assert.equal(slots[2]?.working, true);
  assert.equal(slots[17]?.working, true); // 16:30
  assert.equal(slots[18]?.working, false); // 17:00
  assert.deepEqual(slots.at(-1)?.end, plainTime(18, 0));
  const full = getTimeAxis({ step: { minutes: 60 } });
  assert.equal(full.at(-1)?.endSecond, 86400);
  assert.deepEqual(full.at(-1)?.end, plainTime(0, 0));
  // A step that does not divide the range shortens the last slot.
  const odd = getTimeAxis({
    start: plainTime(9, 0),
    end: plainTime(10, 0),
    step: { minutes: 25 },
  });
  assert.deepEqual(
    odd.map((s) => s.endSecond - s.startSecond),
    [1500, 1500, 600],
  );
  assert.throws(() => getTimeAxis({ step: {} }), RangeError);
  assert.throws(
    () =>
      getTimeAxis({
        start: plainTime(10, 0),
        end: plainTime(9, 0),
        step: { minutes: 15 },
      }),
    RangeError,
  );
});
