import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCalendarController,
  type CalendarController,
} from "../dist/calendar/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const make = (
  options: Parameters<typeof createCalendarController>[0] = {},
): CalendarController =>
  createCalendarController({
    locale: "en-GB",
    timeZone: "UTC",
    now: NOW,
    weekStartsOn: 1,
    ...options,
  });
const layout = <K extends string>(controller: CalendarController, kind: K) => {
  const value = controller.getState().layout;
  assert.equal(value.kind, kind);
  return value as never as Record<string, any>;
};

test("month layout: fixedWeeks, flags, headers", () => {
  const month = layout(make(), "month");
  assert.equal(month.months.length, 1);
  assert.equal(month.months[0].weeks.length, 6);
  assert.deepEqual(
    month.weekdays.map((h: { short: string }) => h.short),
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  );
  const days: any[] = month.months[0].weeks.flatMap(
    (w: { days: any[] }) => w.days,
  );
  assert.equal(days.filter((d) => d.today).length, 1);
  assert.equal(days.filter((d) => d.focused).length, 1);
  assert.equal(days.filter((d) => d.inRange).length, 30);
  assert.equal(days.filter((d) => !d.outsideMonth).length, 30);
  assert.equal(days[0].key, "2026-10-26");
});

test("month layout without fixedWeeks", () => {
  const views = {
    month: {
      layout: "month",
      length: { months: 1 },
      align: "month",
      fixedWeeks: false,
    },
  } as const;
  // February 2026 starts on a Sunday: 6 + 28 days = 5 Monday-first rows.
  assert.equal(
    layout(make({ views, defaultDate: "2026-02-10" }), "month").months[0].weeks
      .length,
    5,
  );
  assert.equal(
    layout(make({ defaultDate: "2026-02-10" }), "month").months[0].weeks.length,
    6,
  );
});

test("multi-month and week numbers", () => {
  const multi = layout(
    make({ defaultView: "multiMonth", weekNumbers: "iso" }),
    "month",
  );
  assert.equal(multi.months.length, 3);
  assert.deepEqual(
    multi.months.map((m: { month: number }) => m.month),
    [11, 12, 1],
  );
  assert.equal(multi.weekNumbers, true);
  assert.equal(multi.months[0].weeks[3].weekNumber, 47); // week of 2026-11-16
  const off = layout(make(), "month");
  assert.equal(off.weekNumbers, false);
  const local = layout(
    make({ locale: "en-US", weekStartsOn: 7, weekNumbers: "locale" }),
    "month",
  );
  assert.equal(local.months[0].weeks[0].weekNumber, 45);
});

test("hidden days: work week drops the weekend columns, month keeps them flagged", () => {
  const work = layout(make({ defaultView: "workWeek" }), "time-grid");
  assert.deepEqual(
    work.days.map((d: { dayOfWeek: number }) => d.dayOfWeek),
    [1, 2, 3, 4, 5],
  );
  assert.equal(work.weekdays.length, 5);
  assert.equal(work.weekdays[0].dayOfWeek, 1);
  const month = layout(make({ hiddenDays: [6, 7] }), "month");
  assert.deepEqual(
    month.weekdays.map((h: { dayOfWeek: number }) => h.dayOfWeek),
    [1, 2, 3, 4, 5],
  );
  const days: any[] = month.months[0].weeks.flatMap(
    (w: { days: any[] }) => w.days,
  );
  assert.equal(days.filter((d) => d.hidden).length, (days.length / 7) * 2);
});

test("time grid: step and working hours", () => {
  const week = layout(make({ defaultView: "week" }), "time-grid");
  assert.equal(week.days.length, 7);
  assert.equal(week.slots.length, 48);
  assert.equal(week.days[0].dayOfWeek, 1);
  const custom = layout(
    make({
      defaultView: "day",
      timeGrid: {
        start: "08:00",
        end: "18:00",
        step: 60,
        workingHours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
      },
    }),
    "time-grid",
  );
  assert.equal(custom.days.length, 1);
  assert.equal(custom.slots.length, 10);
  assert.deepEqual(
    custom.slots.map((s: { working: boolean }) => s.working),
    [false, true, true, true, true, true, true, true, true, false],
  );
  assert.deepEqual(custom.workingDays, [1, 2, 3, 4, 5]);
});

test("list layout", () => {
  const agenda = layout(make({ defaultView: "agenda" }), "list");
  assert.equal(agenda.days.length, 7);
  assert.equal(agenda.days[0].key, "2026-11-17");
  const monthLong = layout(
    make({
      defaultView: "agenda",
      views: { agenda: { length: { months: 1 } } as never },
    }),
    "list",
  );
  assert.equal(monthLong.days.length, 30);
  const hidden = layout(
    make({ defaultView: "agenda", hiddenDays: [6, 7] }),
    "list",
  );
  assert.equal(hidden.days.length, 5);
});

test("month layout for a weeks-based custom view and for setRange", () => {
  const controller = make({
    views: {
      twoWeeks: { layout: "month", length: { weeks: 2 }, align: "week" },
    },
    defaultView: "twoWeeks",
  });
  const model = layout(controller, "month");
  assert.equal(model.months[0].weeks.length, 2);
  controller.setView("month");
  controller.setRange({
    start: { calendar: "gregory", year: 2026, month: 11, day: 3 },
    end: { calendar: "gregory", year: 2026, month: 11, day: 16 },
  });
  assert.equal(controller.getState().view, "custom");
  assert.equal(layout(controller, "month").months[0].weeks.length, 3);
});

test("work week default follows the locale weekend", () => {
  const israel = createCalendarController({
    locale: "he-IL",
    timeZone: "UTC",
    now: NOW,
    defaultView: "workWeek",
  });
  const days = (israel.getState().layout as any).days.map(
    (d: { dayOfWeek: number }) => d.dayOfWeek,
  );
  assert.deepEqual(days.sort(), [1, 2, 3, 4, 7]); // Fri/Sat hidden
});
