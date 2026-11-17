import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMiniCalendarController,
  type MiniCalendarOptions,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: MiniCalendarOptions = {
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
};
const d = (y: number, m: number, day: number) => plainDate(y, m, day);
const ymd = (x: { year: number; month: number; day: number }) =>
  `${x.year}-${x.month}-${x.day}`;
const keys = { shift: false, ctrl: false, meta: false };
const days = (c: ReturnType<typeof createMiniCalendarController>): any[] =>
  c.getState().layout.months[0]?.weeks.flatMap((w) => w.days) ?? [];

test("renders one 6-row month with title and flags", () => {
  const c = createMiniCalendarController(base);
  assert.equal(c.getState().title.text, "November 2026");
  assert.equal(c.getState().layout.months[0]?.weeks.length, 6);
  assert.equal(days(c).filter((x) => x.today).length, 1);
  assert.equal(days(c).filter((x) => x.focused).length, 1);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-1");
});

test("own paging, independent of the main calendar", () => {
  const months: unknown[] = [];
  const c = createMiniCalendarController({
    ...base,
    onMonthChange: (m) => months.push(m),
  });
  c.next();
  assert.equal(c.getState().title.text, "December 2026");
  c.prev();
  c.prev();
  assert.equal(c.getState().title.text, "October 2026");
  assert.deepEqual(months, [
    { year: 2026, month: 12 },
    { year: 2026, month: 11 },
    { year: 2026, month: 10 },
  ]);
  c.next();
  c.next();
  c.next();
  c.next();
  assert.equal(c.getState().title.text, "February 2027");
});

test("controlled month", () => {
  const months: unknown[] = [];
  const c = createMiniCalendarController({
    ...base,
    month: { year: 2026, month: 5 },
    onMonthChange: (m) => months.push(m),
  });
  assert.equal(c.getState().title.text, "May 2026");
  c.next();
  assert.equal(c.getState().title.text, "May 2026");
  assert.deepEqual(months, [{ year: 2026, month: 6 }]);
  c.setOptions({ month: { year: 2026, month: 6 } });
  assert.equal(c.getState().title.text, "June 2026");
});

test("follows the main calendar only when its date leaves the month (C11)", () => {
  const visible = (
    a: [number, number, number],
    b: [number, number, number],
  ) => ({ start: d(...a), end: d(...b) });
  const c = createMiniCalendarController({
    ...base,
    syncWith: {
      date: d(2026, 11, 17),
      visibleRange: visible([2026, 10, 26], [2026, 12, 6]),
    },
  });
  assert.equal(c.getState().title.text, "November 2026");
  // The user pages the mini calendar on its own.
  c.next();
  assert.equal(c.getState().title.text, "December 2026");
  // The main calendar moves inside the mini calendar's old month: mini does not jump back.
  c.setOptions({
    syncWith: {
      date: d(2026, 11, 24),
      visibleRange: visible([2026, 10, 26], [2026, 12, 6]),
    },
  });
  assert.equal(c.getState().title.text, "November 2026");
  // The main calendar leaves November: mini follows.
  c.setOptions({
    syncWith: {
      date: d(2027, 1, 5),
      visibleRange: visible([2026, 12, 28], [2027, 2, 7]),
    },
  });
  assert.equal(c.getState().title.text, "January 2027");
  // Unchanged main date: paging stays where the user put it.
  c.prev();
  c.setOptions({
    syncWith: {
      date: d(2027, 1, 5),
      visibleRange: visible([2026, 12, 28], [2027, 2, 7]),
    },
  });
  assert.equal(c.getState().title.text, "December 2026");
});

test("in-range days follow syncWith.visibleRange", () => {
  const c = createMiniCalendarController({
    ...base,
    syncWith: {
      date: d(2026, 11, 17),
      visibleRange: { start: d(2026, 11, 16), end: d(2026, 11, 22) },
    },
  });
  assert.deepEqual(
    days(c)
      .filter((x) => x.inRange)
      .map((x) => x.key),
    [
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ],
  );
  assert.equal(
    c.getCellAttributes(days(c).find((x) => x.key === "2026-11-18"))[
      "data-in-range"
    ],
    true,
  );
  assert.equal(
    c.getCellAttributes(days(c).find((x) => x.key === "2026-11-10"))[
      "data-in-range"
    ],
    false,
  );
});

test("marked days get data-marked and a label suffix", () => {
  const c = createMiniCalendarController({
    ...base,
    isMarked: (date) => date.day === 20 && date.month === 11,
  });
  const marked = days(c).filter((x) => x.marked);
  assert.deepEqual(
    marked.map((x) => x.key),
    ["2026-11-20"],
  );
  const attrs = c.getCellAttributes(marked[0]);
  assert.equal(attrs["data-marked"], true);
  assert.equal(attrs["aria-label"], "Friday, November 20, 2026, has events");
  assert.equal(c.getCellAttributes(days(c)[10])["data-marked"], false);
});

test("onNavigate on activation and Enter (F2)", () => {
  const calls: string[] = [];
  const c = createMiniCalendarController({
    ...base,
    onNavigate: (date) => calls.push(ymd(date)),
  });
  c.activateDate(d(2026, 11, 20), "pointer");
  assert.equal(ymd(c.getState().focusedDate), "2026-11-20");
  assert.equal(c.handleKeyDown("Enter", keys), true);
  assert.deepEqual(calls, ["2026-11-20", "2026-11-20"]);
  // Clicking an adjacent-month day shows that month.
  c.activateDate(d(2026, 12, 2), "pointer");
  assert.equal(c.getState().title.text, "December 2026");
  assert.equal(calls.at(-1), "2026-12-2");
});

test("keyboard moves focus and pages across months", () => {
  const c = createMiniCalendarController(base);
  c.handleKeyDown("ArrowRight", keys);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-2");
  c.handleKeyDown("PageDown", keys);
  assert.equal(c.getState().title.text, "December 2026");
  assert.equal(ymd(c.getState().focusedDate), "2026-12-2");
  c.handleKeyDown("ArrowUp", keys);
  c.handleKeyDown("ArrowUp", keys);
  assert.equal(c.getState().title.text, "November 2026");
  assert.equal(c.handleKeyDown("x", keys), false);
});

test("min and max disable paging and mark days disabled", () => {
  const c = createMiniCalendarController({
    ...base,
    min: "2026-11-10",
    max: "2026-12-20",
  });
  assert.equal(c.getState().canGoPrev, false);
  c.prev();
  assert.equal(c.getState().title.text, "November 2026");
  c.next();
  assert.equal(c.getState().canGoNext, false);
  assert.equal(c.getNavAttributes("next")["aria-disabled"], "true");
  const calls: string[] = [];
  c.setOptions({ onNavigate: (x) => calls.push(ymd(x)) });
  c.activateDate(d(2026, 12, 28), "pointer");
  assert.deepEqual(calls, []);
});
