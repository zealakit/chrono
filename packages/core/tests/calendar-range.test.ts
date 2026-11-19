import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBuiltInViews,
  getRange,
  getVisibleRange,
} from "../dist/calendar/index.js";
import {
  dayOfWeek,
  plainDate,
  type DayOfWeek,
} from "../dist/foundation/index.js";

const views = getBuiltInViews([6, 7]);
const ymd = (d: { year: number; month: number; day: number }) =>
  `${d.year}-${d.month}-${d.day}`;
const WEEK_STARTS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];
const ANCHORS = [
  plainDate(2026, 1, 31),
  plainDate(2026, 2, 28),
  plainDate(2024, 2, 29),
  plainDate(2026, 12, 31),
  plainDate(2026, 11, 17),
];

test("ranges for every built-in x all weekStartsOn x month ends", () => {
  for (const weekStartsOn of WEEK_STARTS) {
    for (const anchor of ANCHORS) {
      for (const definition of Object.values(views)) {
        const range = getRange(definition, anchor, { weekStartsOn });
        const visible = getVisibleRange(definition, range, { weekStartsOn });
        const label = `${definition.id} ${ymd(anchor)} wso=${weekStartsOn}`;
        // The anchor is always inside its own range.
        assert.ok(
          Date.UTC(anchor.year, anchor.month - 1, anchor.day) >=
            Date.UTC(
              range.start.year,
              range.start.month - 1,
              range.start.day,
            ) &&
            Date.UTC(anchor.year, anchor.month - 1, anchor.day) <=
              Date.UTC(range.end.year, range.end.month - 1, range.end.day),
          label,
        );
        if (definition.align === "week")
          assert.equal(dayOfWeek(range.start), weekStartsOn, label);
        if (definition.align === "month")
          assert.equal(range.start.day, 1, label);
        if (definition.layout === "month") {
          assert.equal(dayOfWeek(visible.start), weekStartsOn, label);
          const rows =
            (Date.UTC(
              visible.end.year,
              visible.end.month - 1,
              visible.end.day,
            ) -
              Date.UTC(
                visible.start.year,
                visible.start.month - 1,
                visible.start.day,
              )) /
              86400000 +
            1;
          assert.equal(rows % 7, 0, label);
        } else {
          assert.deepEqual(visible, range, label);
        }
      }
    }
  }
});

test("specific ranges", () => {
  const ctx = { weekStartsOn: 1 } as const;
  const nov = plainDate(2026, 11, 17);
  const month = getRange(views.month as never, nov, ctx);
  assert.deepEqual(
    [ymd(month.start), ymd(month.end)],
    ["2026-11-1", "2026-11-30"],
  );
  const week = getRange(views.week as never, nov, ctx);
  assert.deepEqual(
    [ymd(week.start), ymd(week.end)],
    ["2026-11-16", "2026-11-22"],
  );
  const day = getRange(views.day as never, nov, ctx);
  assert.deepEqual(
    [ymd(day.start), ymd(day.end)],
    ["2026-11-17", "2026-11-17"],
  );
  const agenda = getRange(views.agenda as never, nov, ctx);
  assert.deepEqual(
    [ymd(agenda.start), ymd(agenda.end)],
    ["2026-11-17", "2026-11-23"],
  );
  const multi = getRange(views.multiMonth as never, nov, ctx);
  assert.deepEqual(
    [ymd(multi.start), ymd(multi.end)],
    ["2026-11-1", "2027-1-31"],
  );
  const visible = getVisibleRange(views.month as never, month, ctx);
  assert.deepEqual(
    [ymd(visible.start), ymd(visible.end)],
    ["2026-10-26", "2026-12-6"],
  ); // plan 04 C4 example
  const feb = getRange(views.month as never, plainDate(2024, 2, 10), ctx);
  assert.equal(feb.end.day, 29);
});

test("year alignment and custom lengths", () => {
  const ctx = { weekStartsOn: 1 } as const;
  const year = {
    id: "year",
    layout: "month",
    length: { months: 12 },
    align: "year",
    months: 12,
  } as const;
  const range = getRange(year, plainDate(2026, 6, 15), ctx);
  assert.deepEqual(
    [ymd(range.start), ymd(range.end)],
    ["2026-1-1", "2026-12-31"],
  );
  const twoWeeks = {
    id: "two",
    layout: "month",
    length: { weeks: 2 },
    align: "week",
  } as const;
  const two = getRange(twoWeeks, plainDate(2026, 11, 17), ctx);
  assert.deepEqual(
    [ymd(two.start), ymd(two.end)],
    ["2026-11-16", "2026-11-29"],
  );
  assert.deepEqual(getVisibleRange(twoWeeks, two, ctx), two);
});

test("hidden days stay inside the range (hidden, not removed)", () => {
  const range = getRange(views.workWeek as never, plainDate(2026, 11, 17), {
    weekStartsOn: 1,
  });
  assert.equal(range.end.day - range.start.day, 6);
});
