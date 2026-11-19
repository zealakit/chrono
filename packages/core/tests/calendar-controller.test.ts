import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCalendarController,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
};
const keys = { shift: false, ctrl: false, meta: false };
const ymd = (x: { year: number; month: number; day: number }) =>
  `${x.year}-${x.month}-${x.day}`;
const norm = (text: string) => text.replace(/[\u202f\u00a0\u2009]/g, " ");
const d = (y: number, m: number, day: number) => plainDate(y, m, day);

test("uncontrolled view and date call their handlers", () => {
  const views: string[] = [];
  const dates: string[] = [];
  const c = createCalendarController({
    ...base,
    onViewChange: (v) => views.push(v),
    onDateChange: (x) => dates.push(ymd(x)),
  });
  assert.equal(c.getState().view, "month");
  c.setView("week");
  c.next();
  c.goTo("2027-03-03");
  assert.deepEqual(views, ["week"]);
  assert.deepEqual(dates, ["2026-11-24", "2027-3-3"]);
  assert.equal(c.getState().view, "week");
  assert.equal(ymd(c.getState().date), "2027-3-3");
});

test("controlled view and date only call back; setOptions applies them", () => {
  const views: string[] = [];
  const dates: string[] = [];
  const c = createCalendarController({
    ...base,
    view: "month",
    date: "2026-11-17",
    onViewChange: (v) => views.push(v),
    onDateChange: (x) => dates.push(ymd(x)),
  });
  c.next();
  c.setView("week");
  assert.equal(c.getState().view, "month");
  assert.equal(ymd(c.getState().date), "2026-11-17");
  assert.deepEqual(views, ["week"]);
  assert.deepEqual(dates, ["2026-12-17"]);
  c.setOptions({ view: "week", date: "2026-12-17" });
  assert.equal(c.getState().view, "week");
  assert.equal(ymd(c.getState().date), "2026-12-17");
});

test("onVisibleRangeChange fires once at start and only on a real change", () => {
  const calls: string[] = [];
  const c = createCalendarController({
    ...base,
    lazyStart: true,
    onVisibleRangeChange: (r, info) =>
      calls.push(`${info.view} ${ymd(r.start)}..${ymd(r.end)}`),
  });
  assert.deepEqual(calls, []); // not before start()
  c.start();
  c.start();
  assert.deepEqual(calls, ["month 2026-10-26..2026-12-6"]);
  c.focusDate(d(2026, 11, 20));
  c.setOptions({ locale: "en-US" });
  assert.equal(calls.length, 1);
  c.next();
  assert.equal(calls.length, 2);
  c.setView("week");
  assert.equal(calls.length, 3);
  assert.match(calls[2] as string, /^week 2026-12-14\.\.2026-12-20$/);
  // Same visible range in another view still reports (the view changed with it).
  const eager = [] as string[];
  createCalendarController({
    ...base,
    onVisibleRangeChange: () => eager.push("x"),
  });
  assert.equal(eager.length, 1);
});

test("setOptions with equal values does not notify", () => {
  const c = createCalendarController({
    ...base,
    hiddenDays: [6, 7],
    timeGrid: { step: 15 },
    views: { x: { layout: "list", length: { days: 2 }, align: "day" } },
  });
  let calls = 0;
  c.subscribe(() => {
    calls += 1;
  });
  const before = c.getState();
  c.setOptions({
    ...base,
    hiddenDays: [6, 7],
    timeGrid: { step: 15 },
    views: { x: { layout: "list", length: { days: 2 }, align: "day" } },
    onViewChange: () => {},
  });
  assert.equal(calls, 0);
  assert.equal(c.getState(), before);
  c.setOptions({ locale: "de-DE" });
  assert.equal(calls, 1);
  assert.notEqual(c.getState(), before);
});

test("today comes from now and timeZone, and updates with options", () => {
  const c = createCalendarController({
    ...base,
    timeZone: "Asia/Ho_Chi_Minh",
    now: Date.UTC(2026, 10, 17, 23, 30),
  });
  assert.equal(ymd(c.getState().today), "2026-11-18");
  assert.equal(ymd(c.getState().date), "2026-11-18");
  c.setOptions({ now: Date.UTC(2026, 10, 19, 1) });
  assert.equal(ymd(c.getState().today), "2026-11-19");
});

test("min and max disable the nav buttons", () => {
  const c = createCalendarController({
    ...base,
    min: "2026-11-10",
    max: "2027-01-20",
  });
  assert.equal(c.getState().canGoPrev, false);
  assert.equal(c.getState().canGoNext, true);
  assert.equal(c.getNavAttributes("prev")["aria-disabled"], "true");
  assert.equal(c.getNavAttributes("prev")["data-disabled"], true);
  assert.equal(c.getNavAttributes("next")["aria-disabled"], undefined);
  c.next();
  c.next();
  c.next();
  assert.equal(ymd(c.getState().date), "2027-1-17");
  assert.equal(c.getState().canGoNext, false);
  const cells = (c.getState().layout as any).months[0].weeks.flatMap(
    (w: any) => w.days,
  );
  assert.ok(cells.some((x: any) => x.disabled));
  assert.equal(
    c.getCellAttributes(cells.find((x: any) => x.disabled))["data-disabled"],
    true,
  );
});

test("keyboard in the month grid (LTR)", () => {
  const c = createCalendarController(base);
  const press = (key: string, shift = false) =>
    c.handleKeyDown(key, { ...keys, shift });
  assert.equal(press("ArrowRight"), true);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-18");
  press("ArrowDown");
  assert.equal(ymd(c.getState().focusedDate), "2026-11-25");
  press("Home");
  assert.equal(ymd(c.getState().focusedDate), "2026-11-23");
  press("End");
  assert.equal(ymd(c.getState().focusedDate), "2026-11-29");
  // Leaving the range navigates: Nov 29 -> Dec 6 is in the visible range but not the month.
  press("ArrowDown");
  assert.equal(ymd(c.getState().date), "2026-12-6");
  assert.equal(c.getState().title.text, "December 2026");
  assert.equal(ymd(c.getState().focusedDate), "2026-12-6");
  press("PageUp");
  assert.equal(c.getState().title.text, "November 2026");
  press("PageDown", true);
  assert.equal(ymd(c.getState().focusedDate), "2027-11-6");
  assert.equal(c.handleKeyDown("a", keys), false);
  assert.equal(c.handleKeyDown("ArrowRight", { ...keys, ctrl: true }), false);
  assert.equal(c.handleKeyDown("ArrowRight", { ...keys, meta: true }), false);
});

test("keyboard under RTL swaps left and right", () => {
  const c = createCalendarController({ ...base, locale: "ar-EG" });
  assert.equal(c.getState().direction, "rtl");
  const before = c.getState().focusedDate;
  c.handleKeyDown("ArrowLeft", keys);
  assert.equal(c.getState().focusedDate.day, before.day + 1);
  c.handleKeyDown("ArrowRight", keys);
  assert.equal(c.getState().focusedDate.day, before.day);
});

test("keyboard in a time grid moves along the header row and pages by range", () => {
  const c = createCalendarController({ ...base, defaultView: "week" });
  assert.equal(ymd(c.getState().focusedDate), "2026-11-17");
  c.handleKeyDown("ArrowRight", keys);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-18");
  c.handleKeyDown("Home", keys);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-16");
  c.handleKeyDown("End", keys);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-22");
  c.handleKeyDown("ArrowRight", keys); // leaves the week
  assert.equal(ymd(c.getState().focusedDate), "2026-11-23");
  assert.equal(norm(c.getState().title.text), "Nov 23 – 29, 2026");
  c.handleKeyDown("PageUp", keys);
  assert.equal(norm(c.getState().title.text), "Nov 16 – 22, 2026");
  c.handleKeyDown("ArrowUp", keys); // across the other axis: handled, no move
  assert.equal(ymd(c.getState().focusedDate), "2026-11-16");
});

test("keyboard skips hidden days", () => {
  const c = createCalendarController({ ...base, defaultView: "workWeek" });
  c.handleKeyDown("End", keys);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-20");
  c.handleKeyDown("ArrowRight", keys);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-23"); // Mon of next week
  const month = createCalendarController({ ...base, hiddenDays: [6, 7] });
  month.focusDate(d(2026, 11, 20));
  month.handleKeyDown("ArrowRight", keys);
  assert.equal(ymd(month.getState().focusedDate), "2026-11-23");
});

test("agenda keyboard uses up and down", () => {
  const c = createCalendarController({ ...base, defaultView: "agenda" });
  c.handleKeyDown("ArrowDown", keys);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-18");
  c.handleKeyDown("ArrowUp", keys);
  c.handleKeyDown("ArrowUp", keys); // leaves the range backwards
  assert.equal(ymd(c.getState().focusedDate), "2026-11-16");
});

test("Enter and pointer activation call onDateActivate (C6)", () => {
  const calls: string[] = [];
  const c = createCalendarController({
    ...base,
    onDateActivate: (date, info) =>
      calls.push(`${ymd(date)} ${info.view} ${info.source}`),
  });
  assert.equal(c.handleKeyDown("Enter", keys), true);
  c.activateDate(d(2026, 11, 20), "pointer");
  assert.deepEqual(calls, [
    "2026-11-17 month keyboard",
    "2026-11-20 month pointer",
  ]);
  assert.equal(ymd(c.getState().focusedDate), "2026-11-20");
  // Activating a day in the adjacent month does not change the view, only the focus moves.
  c.activateDate(d(2026, 12, 2), "pointer");
  assert.equal(c.getState().view, "month");
  assert.equal(calls.length, 3);
});

test("controller never changes selectedDate by itself", () => {
  const c = createCalendarController({ ...base, selectedDate: "2026-11-20" });
  c.activateDate(d(2026, 11, 22), "pointer");
  c.handleKeyDown("Enter", keys);
  const selected = (c.getState().layout as any).months[0].weeks
    .flatMap((w: any) => w.days)
    .filter((x: any) => x.selected);
  assert.deepEqual(
    selected.map((x: any) => x.key),
    ["2026-11-20"],
  );
});

test("destroy stops notifications", () => {
  const c = createCalendarController(base);
  let calls = 0;
  c.subscribe(() => {
    calls += 1;
  });
  c.destroy();
  c.next();
  assert.equal(calls, 0);
});
