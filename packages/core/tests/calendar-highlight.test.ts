import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCalendarController,
  createMiniCalendarController,
  type CalendarOptions,
} from "../dist/calendar/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
};
const keys = { shift: false, ctrl: false, meta: false };

function collect(layout: any): any[] {
  if (layout.kind === "month")
    return layout.months.flatMap((m: any) =>
      m.weeks.flatMap((w: any) => w.days),
    );
  return layout.days;
}
const flagged = (days: any[], flag: "selected" | "highlighted") =>
  days.filter((d) => d[flag]).map((d) => d.key);

test("selectedDate and highlightedDates (array) in every layout", () => {
  for (const view of [
    "month",
    "week",
    "workWeek",
    "day",
    "agenda",
    "multiMonth",
  ]) {
    const c = createCalendarController({
      ...base,
      defaultView: view,
      selectedDate: "2026-11-17",
      highlightedDates: ["2026-11-18", "2026-11-19"],
    });
    const days = collect(c.getState().layout);
    const expectedSelected =
      view === "day" ||
      view === "week" ||
      view === "workWeek" ||
      view === "agenda" ||
      view.includes("onth")
        ? ["2026-11-17"]
        : [];
    // `day` starts on the anchor, so 17 is in it; every other view contains the 17th too.
    assert.deepEqual(flagged(days, "selected"), expectedSelected, view);
    const highlightedExpected =
      view === "day" ? [] : ["2026-11-18", "2026-11-19"];
    assert.deepEqual(flagged(days, "highlighted"), highlightedExpected, view);
  }
});

test("predicate highlightedDates", () => {
  const c = createCalendarController({
    ...base,
    highlightedDates: (date) => date.month === 11 && date.day % 10 === 0,
  });
  assert.deepEqual(flagged(collect(c.getState().layout), "highlighted"), [
    "2026-11-10",
    "2026-11-20",
    "2026-11-30",
  ]);
  const cell = collect(c.getState().layout).find(
    (d: any) => d.key === "2026-11-20",
  );
  assert.equal(c.getCellAttributes(cell)["data-highlighted"], true);
  assert.equal(c.getCellAttributes(cell)["aria-selected"], undefined); // not a selection widget
});

test("cells carry data-selected and the label word", () => {
  const c = createCalendarController({ ...base, selectedDate: "2026-11-17" });
  const cell = collect(c.getState().layout).find(
    (d: any) => d.key === "2026-11-17",
  );
  const attrs = c.getCellAttributes(cell);
  assert.equal(attrs["data-selected"], true);
  assert.equal(
    attrs["aria-label"],
    "Tuesday, November 17, 2026, today, selected",
  );
  assert.equal(
    "aria-selected" in attrs && attrs["aria-selected"] !== undefined,
    false,
  );
});

test("time-grid column headers and agenda days carry the flags", () => {
  const week = createCalendarController({
    ...base,
    defaultView: "week",
    selectedDate: "2026-11-17",
    highlightedDates: ["2026-11-18"],
  });
  const header = collect(week.getState().layout).find(
    (d: any) => d.key === "2026-11-17",
  );
  assert.equal(week.getColumnHeaderAttributes(header)["data-selected"], true);
  const next = collect(week.getState().layout).find(
    (d: any) => d.key === "2026-11-18",
  );
  assert.equal(week.getColumnHeaderAttributes(next)["data-highlighted"], true);
  const agenda = createCalendarController({
    ...base,
    defaultView: "agenda",
    selectedDate: "2026-11-17",
  });
  assert.equal(
    agenda.getAgendaDayAttributes(collect(agenda.getState().layout)[0])[
      "data-selected"
    ],
    true,
  );
});

test("Mini Calendar marks the same flags", () => {
  const mini = createMiniCalendarController({
    ...base,
    selectedDate: "2026-11-17",
    highlightedDates: ["2026-11-20"],
  });
  const days = collect(mini.getState().layout);
  assert.deepEqual(flagged(days, "selected"), ["2026-11-17"]);
  assert.deepEqual(flagged(days, "highlighted"), ["2026-11-20"]);
});

test("nothing changes the flags except the app", () => {
  const c = createCalendarController({
    ...base,
    selectedDate: "2026-11-17",
    highlightedDates: ["2026-11-18"],
  });
  const mini = createMiniCalendarController({
    ...base,
    selectedDate: "2026-11-17",
  });
  c.activateDate(
    { calendar: "gregory", year: 2026, month: 11, day: 25 },
    "pointer",
  );
  c.handleKeyDown("ArrowRight", keys);
  c.handleKeyDown("Enter", keys);
  c.next();
  c.prev();
  mini.activateDate(
    { calendar: "gregory", year: 2026, month: 11, day: 25 },
    "pointer",
  );
  assert.deepEqual(flagged(collect(c.getState().layout), "selected"), [
    "2026-11-17",
  ]);
  assert.deepEqual(flagged(collect(c.getState().layout), "highlighted"), [
    "2026-11-18",
  ]);
  assert.deepEqual(flagged(collect(mini.getState().layout), "selected"), [
    "2026-11-17",
  ]);
  c.setOptions({ selectedDate: "2026-11-19" });
  assert.deepEqual(flagged(collect(c.getState().layout), "selected"), [
    "2026-11-19",
  ]);
  c.setOptions({ selectedDate: undefined });
  assert.deepEqual(flagged(collect(c.getState().layout), "selected"), []);
});
