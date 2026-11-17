import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getRange,
  navigate,
  resolveViews,
  type NavigationContext,
  type NavigationState,
} from "../dist/calendar/index.js";
import { plainDate } from "../dist/foundation/index.js";

const d = (y: number, m: number, day: number) => plainDate(y, m, day);
const ymd = (x: { year: number; month: number; day: number }) =>
  `${x.year}-${x.month}-${x.day}`;

const ctx = (extra: Partial<NavigationContext> = {}): NavigationContext => ({
  views: resolveViews(
    { threeDay: { layout: "time-grid", length: { days: 3 }, align: "day" } },
    [6, 7],
  ),
  weekStartsOn: 1,
  hiddenDays: [],
  today: d(2026, 11, 17),
  ...extra,
});
const start = (view: string, date = d(2026, 11, 17)): NavigationState => ({
  view,
  anchor: date,
  focusedDate: date,
});

test("prev and next move by the view length", () => {
  const c = ctx();
  assert.equal(ymd(navigate(start("month"), "next", c).anchor), "2026-12-17");
  assert.equal(ymd(navigate(start("month"), "prev", c).anchor), "2026-10-17");
  assert.equal(ymd(navigate(start("week"), "next", c).anchor), "2026-11-24");
  assert.equal(ymd(navigate(start("day"), "prev", c).anchor), "2026-11-16");
  assert.equal(
    ymd(navigate(start("threeDay"), "next", c).anchor),
    "2026-11-20",
  );
  assert.equal(ymd(navigate(start("agenda"), "next", c).anchor), "2026-11-24");
  // multi-month pages by its length
  assert.equal(
    ymd(navigate(start("multiMonth"), "next", c).anchor),
    "2027-2-17",
  );
  // month-end clamping
  assert.equal(
    ymd(navigate(start("month", d(2026, 1, 31)), "next", c).anchor),
    "2026-2-28",
  );
});

test("focus moves with the range", () => {
  const next = navigate(start("month"), "next", ctx());
  assert.equal(ymd(next.focusedDate), "2026-12-17");
  const week = navigate(
    { ...start("week"), focusedDate: d(2026, 11, 19) },
    "next",
    ctx(),
  );
  assert.equal(ymd(week.focusedDate), "2026-11-26");
});

test("today and goTo", () => {
  const c = ctx();
  const away = navigate(start("month", d(2027, 5, 5)), "today", c);
  assert.equal(ymd(away.anchor), "2026-11-17");
  assert.equal(ymd(away.focusedDate), "2026-11-17");
  const go = navigate(start("week"), { goTo: d(2027, 3, 3) }, c);
  assert.deepEqual(
    [ymd(go.anchor), ymd(go.focusedDate), go.view],
    ["2027-3-3", "2027-3-3", "week"],
  );
});

test("min and max clamp navigation (C10)", () => {
  const c = ctx({ min: d(2026, 11, 10), max: d(2027, 1, 20) });
  // The range already starts before min: nothing earlier is allowed.
  const blocked = start("month");
  assert.equal(navigate(blocked, "prev", c), blocked);
  const dec = navigate(blocked, "next", c);
  assert.equal(ymd(dec.anchor), "2026-12-17");
  const jan = navigate(dec, "next", c);
  assert.equal(ymd(jan.anchor), "2027-1-17");
  assert.equal(navigate(jan, "next", c), jan);
  assert.equal(
    ymd(navigate(start("month"), { goTo: d(2030, 1, 1) }, c).anchor),
    "2027-1-20",
  );
  assert.equal(
    ymd(navigate(start("month"), { goTo: d(2000, 1, 1) }, c).anchor),
    "2026-11-10",
  );
});

test("changing the view keeps the focus when it is still inside, else moves it", () => {
  const c = ctx();
  const inside = navigate(
    { ...start("month"), focusedDate: d(2026, 11, 18) },
    { view: "week" },
    c,
  );
  assert.equal(ymd(inside.focusedDate), "2026-11-18");
  assert.equal(inside.view, "week");
  const outside = navigate(
    { ...start("month", d(2026, 11, 17)), focusedDate: d(2026, 11, 3) },
    { view: "week" },
    c,
  );
  assert.equal(ymd(outside.focusedDate), "2026-11-16"); // clamped into the week
  // Focus on a hidden day moves to the first visible one.
  const hidden = navigate(
    { ...start("month"), focusedDate: d(2026, 11, 21) },
    { view: "workWeek" },
    c,
  );
  assert.equal(ymd(hidden.focusedDate), "2026-11-16");
  assert.throws(
    () => navigate(start("month"), { view: "nope" }, c),
    RangeError,
  );
});

test("setRange switches to an ad-hoc view whose length is the range length", () => {
  const c = ctx();
  const ranged = navigate(
    start("month"),
    { range: { start: d(2026, 11, 3), end: d(2026, 11, 12) } },
    c,
  );
  assert.equal(ranged.view, "custom");
  assert.deepEqual(ranged.custom?.length, { days: 10 });
  assert.equal(ymd(ranged.anchor), "2026-11-3");
  const next = navigate(ranged, "next", c);
  assert.equal(ymd(next.anchor), "2026-11-13");
  const range = getRange(next.custom as never, next.anchor, c);
  assert.deepEqual(
    [ymd(range.start), ymd(range.end)],
    ["2026-11-13", "2026-11-22"],
  );
  // Choosing a named view leaves the ad-hoc one.
  const back = navigate(next, { view: "week" }, c);
  assert.equal(back.custom, undefined);
});
