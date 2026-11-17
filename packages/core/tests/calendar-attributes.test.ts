import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCalendarController,
  createMiniCalendarController,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { normalizeAttributes } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
};
const norm = (record: Record<string, unknown>) =>
  normalizeAttributes(record as never);
const FORBIDDEN = /^(style|class|classname)$/i;

function allRecords(
  c: ReturnType<typeof createCalendarController>,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  const state = c.getState();
  out.root = c.getRootAttributes();
  out.title = c.getTitleAttributes();
  for (const kind of ["prev", "next", "today"] as const)
    out[`nav-${kind}`] = c.getNavAttributes(kind);
  out.viewButton = c.getViewButtonAttributes("month");
  out.grid = c.getGridAttributes();
  out.timeGrid = c.getTimeGridAttributes();
  out.agenda = c.getAgendaAttributes();
  out.weekNumber = c.getWeekNumberAttributes(47);
  const layout = state.layout;
  if (layout.kind === "month") {
    out.columnHeader = c.getColumnHeaderAttributes(layout.weekdays[0] as never);
    out.cell = c.getCellAttributes(
      layout.months[0]?.weeks[0]?.days[0] as never,
    );
  } else if (layout.kind === "time-grid") {
    out.dayHeader = c.getColumnHeaderAttributes(layout.days[0] as never);
    out.slot = c.getSlotAttributes(
      layout.slots[0] as never,
      layout.days[0] as never,
    );
  } else {
    out.agendaDay = c.getAgendaDayAttributes(layout.days[0] as never);
  }
  return out;
}

test("attribute contract for every element (month)", () => {
  const c = createCalendarController(base);
  const a = allRecords(c);
  assert.deepEqual(norm(a.root as never), {
    "data-chrono-calendar": "",
    "data-view": "month",
    "data-layout": "month",
    dir: "ltr",
  });
  assert.deepEqual(norm(a.title as never), {
    id: "cal-title",
    "aria-live": "polite",
  });
  assert.deepEqual(norm(a["nav-prev"] as never), {
    type: "button",
    "aria-label": "Previous",
  });
  assert.deepEqual(norm(a["nav-next"] as never), {
    type: "button",
    "aria-label": "Next",
  });
  assert.deepEqual(norm(a["nav-today"] as never), {
    type: "button",
    "aria-label": "Today",
  });
  assert.deepEqual(norm(a.viewButton as never), {
    type: "button",
    "aria-pressed": "true",
    "data-view": "month",
  });
  assert.deepEqual(norm(c.getViewButtonAttributes("week")), {
    type: "button",
    "aria-pressed": "false",
    "data-view": "week",
  });
  assert.deepEqual(norm(a.grid as never), {
    role: "grid",
    "aria-labelledby": "cal-title",
  });
  assert.deepEqual(norm(a.columnHeader as never), {
    role: "columnheader",
    abbr: "Monday",
  });
  assert.deepEqual(norm(a.weekNumber as never), {
    role: "rowheader",
    "aria-label": "Week 47",
  });
  const cell = norm(a.cell as never);
  assert.equal(cell.role, "gridcell");
  assert.equal(cell["aria-label"], "Monday, October 26, 2026");
  assert.equal(cell.tabindex, "-1");
  assert.equal(cell["data-chrono-key"], "2026-10-26");
  assert.equal("data-outside-month" in cell, true);
  assert.equal("data-today" in cell, false);
});

test("today and focused cells", () => {
  const c = createCalendarController(base);
  const layout = c.getState().layout as any;
  const today = layout.months[0].weeks
    .flatMap((w: any) => w.days)
    .find((d: any) => d.today);
  const attrs = norm(c.getCellAttributes(today));
  assert.equal(attrs["aria-current"], "date");
  assert.equal(attrs.tabindex, "0");
  assert.equal("data-today" in attrs, true);
  assert.equal("data-focused" in attrs, true);
  assert.equal(attrs["aria-label"], "Tuesday, November 17, 2026, today");
  const tabStops = layout.months[0].weeks
    .flatMap((w: any) => w.days)
    .filter((d: any) => c.getCellAttributes(d).tabindex === 0);
  assert.equal(tabStops.length, 1);
});

test("time grid, agenda and multi-month attributes", () => {
  const week = createCalendarController({
    ...base,
    defaultView: "week",
    timeGrid: {
      workingHours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
    },
  });
  const a = allRecords(week);
  assert.deepEqual(norm(a.timeGrid as never), {
    role: "grid",
    "aria-labelledby": "cal-title",
  });
  assert.equal(norm(a.dayHeader as never).role, "columnheader");
  assert.equal(norm(a.dayHeader as never)["data-chrono-key"], "2026-11-16");
  assert.deepEqual(norm(a.slot as never), { "data-slot-start": "00:00:00" });
  const layout = week.getState().layout as any;
  const nine = layout.slots.find(
    (s: any) => s.start.hour === 9 && s.start.minute === 0,
  );
  assert.deepEqual(norm(week.getSlotAttributes(nine, layout.days[0])), {
    "data-slot-start": "09:00:00",
    "data-working-hours": "",
  });
  assert.equal(
    "data-working-hours" in norm(week.getSlotAttributes(nine, layout.days[6])),
    false,
  ); // Sunday
  const agenda = createCalendarController({ ...base, defaultView: "agenda" });
  const b = allRecords(agenda);
  assert.deepEqual(norm(b.agenda as never), {
    role: "list",
    "aria-labelledby": "cal-title",
  });
  assert.equal(norm(b.agendaDay as never).role, "listitem");
  assert.equal("data-today" in norm(b.agendaDay as never), true);
  const multi = createCalendarController({
    ...base,
    defaultView: "multiMonth",
  });
  assert.equal(norm(multi.getGridAttributes(0))["aria-label"], "November 2026");
  assert.equal(norm(multi.getGridAttributes(2))["aria-label"], "January 2027");
  assert.equal("aria-labelledby" in norm(multi.getGridAttributes(1)), false);
});

test("RTL root and disabled nav", () => {
  const c = createCalendarController({
    ...base,
    locale: "ar-EG",
    min: "2026-11-10",
  });
  assert.equal(norm(c.getRootAttributes()).dir, "rtl");
  assert.deepEqual(norm(c.getNavAttributes("prev")), {
    type: "button",
    "aria-label": "Previous",
    "aria-disabled": "true",
    "data-disabled": "",
  });
});

test("message overrides reach the attributes", () => {
  const c = createCalendarController({
    ...base,
    messages: {
      previous: "Trước",
      next: "Sau",
      goToToday: "Hôm nay",
      weekNumber: "Tuần {number}",
    },
  });
  assert.equal(norm(c.getNavAttributes("prev"))["aria-label"], "Trước");
  assert.equal(norm(c.getNavAttributes("next"))["aria-label"], "Sau");
  assert.equal(norm(c.getNavAttributes("today"))["aria-label"], "Hôm nay");
  assert.equal(norm(c.getWeekNumberAttributes(3))["aria-label"], "Tuần 3");
});

test("no record contains style or class (02 §2.8), including the Mini Calendar", () => {
  const records: Record<string, unknown>[] = [];
  for (const view of ["month", "week", "agenda", "multiMonth"]) {
    records.push(
      ...Object.values(
        allRecords(createCalendarController({ ...base, defaultView: view })),
      ),
    );
  }
  const mini = createMiniCalendarController({
    ...base,
    isMarked: () => true,
    syncWith: {
      date: { calendar: "gregory", year: 2026, month: 11, day: 17 },
      visibleRange: {
        start: { calendar: "gregory", year: 2026, month: 11, day: 1 },
        end: { calendar: "gregory", year: 2026, month: 11, day: 30 },
      },
    },
  });
  const layout = mini.getState().layout;
  records.push(
    mini.getRootAttributes(),
    mini.getTitleAttributes(),
    mini.getNavAttributes("prev"),
    mini.getNavAttributes("next"),
    mini.getGridAttributes(),
    mini.getColumnHeaderAttributes(layout.weekdays[0] as never),
    mini.getCellAttributes(layout.months[0]?.weeks[0]?.days[0] as never),
    mini.getWeekNumberAttributes(1),
  );
  assert.ok(records.length > 30);
  for (const record of records) {
    for (const key of Object.keys(record))
      assert.doesNotMatch(key, FORBIDDEN, key);
  }
});

test("mini calendar attribute contract", () => {
  const mini = createMiniCalendarController({ ...base });
  assert.deepEqual(norm(mini.getRootAttributes()), {
    "data-chrono-mini-calendar": "",
    dir: "ltr",
  });
  assert.deepEqual(norm(mini.getTitleAttributes()), {
    id: "cal-title",
    "aria-live": "polite",
  });
  assert.deepEqual(norm(mini.getGridAttributes()), {
    role: "grid",
    "aria-labelledby": "cal-title",
  });
  assert.deepEqual(norm(mini.getNavAttributes("next")), {
    type: "button",
    "aria-label": "Next",
  });
});
