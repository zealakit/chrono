import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  type CalendarOptions,
  applyAttributes,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { type Mounted, mountCalendar } from "./support/reference.ts";
import { click } from "./support/scenarios.ts";
import { norm } from "./support/text.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const live: Mounted[] = [];
const open = (options: CalendarOptions = base) => {
  const mounted = mountCalendar(options);
  live.push(mounted);
  return mounted;
};

beforeEach(resetDom);
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.calendar.destroy();
});

test("renders month view with title, buttons and a grid", () => {
  const { root } = open();
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(root.querySelectorAll('table[role="grid"]').length, 1);
  assert.equal(root.querySelectorAll("td[role=gridcell]").length, 42);
  assert.equal(root.getAttribute("data-view"), "month");
  assert.equal(root.getAttribute("dir"), "ltr");
  assert.equal(
    root
      .querySelector('button[data-view="month"]')
      ?.getAttribute("aria-pressed"),
    "true",
  );
});

test("prev, next and today buttons navigate through delegated clicks", () => {
  const { root } = open();
  const press = (label: string) =>
    click(root.querySelector(`button[aria-label="${label}"]`) as Element);
  press("Next");
  assert.equal(root.querySelector("h2")?.textContent, "December 2026");
  press("Previous");
  press("Previous");
  assert.equal(root.querySelector("h2")?.textContent, "October 2026");
  press("Today");
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
});

test("view buttons switch every layout", () => {
  const { root } = open();
  const view = (id: string) =>
    click(root.querySelector(`button[data-view="${id}"]`) as Element);
  view("week");
  assert.equal(
    norm(root.querySelector("h2")?.textContent ?? ""),
    "Nov 16 – 22, 2026",
  );
  assert.equal(
    root.querySelectorAll('[role="columnheader"][data-chrono-key]').length,
    7,
  );
  assert.equal(root.querySelectorAll("[data-slot-start]").length, 7 * 48);
  view("workWeek");
  assert.equal(
    root.querySelectorAll('[role="columnheader"][data-chrono-key]').length,
    5,
  );
  view("agenda");
  assert.equal(root.querySelectorAll('li[role="listitem"]').length, 7);
  view("multiMonth");
  assert.equal(root.querySelectorAll('table[role="grid"]').length, 3);
  assert.equal(
    root.querySelectorAll('table[role="grid"]')[1]?.getAttribute("aria-label"),
    "December 2026",
  );
  view("day");
  assert.equal(
    root.querySelectorAll('[role="columnheader"][data-chrono-key]').length,
    1,
  );
});

test("uncontrolled handlers fire; controlled values follow setOptions", () => {
  const views: string[] = [];
  const dates: number[] = [];
  const uncontrolled = open({
    ...base,
    onViewChange: (v) => views.push(v),
    onDateChange: (d) => dates.push(d.day),
  });
  click(uncontrolled.root.querySelector('button[data-view="week"]') as Element);
  click(
    uncontrolled.root.querySelector('button[aria-label="Next"]') as Element,
  );
  assert.deepEqual(views, ["week"]);
  assert.deepEqual(dates, [24]);

  const controlled = open({
    ...base,
    view: "month",
    date: "2026-11-17",
    onViewChange: (v) => views.push(v),
  });
  click(controlled.root.querySelector('button[data-view="week"]') as Element);
  assert.equal(controlled.root.getAttribute("data-view"), "month");
  controlled.calendar.setOptions({ view: "week", date: "2026-12-17" });
  assert.equal(controlled.root.getAttribute("data-view"), "week");
  assert.equal(
    norm(controlled.root.querySelector("h2")?.textContent ?? ""),
    "Dec 14 – 20, 2026",
  );
});

test("onVisibleRangeChange fires once at creation and on real changes", () => {
  const calls: string[] = [];
  const { root } = open({
    ...base,
    onVisibleRangeChange: (range, info) =>
      calls.push(`${info.view} ${range.start.month}/${range.start.day}`),
  });
  assert.deepEqual(calls, ["month 10/26"]);
  click(root.querySelector('button[aria-label="Next"]') as Element);
  assert.deepEqual(calls, ["month 10/26", "month 11/30"]);
});

test("min disables the previous button", () => {
  const { root } = open({ ...base, min: "2026-11-10" });
  const prev = root.querySelector(
    'button[aria-label="Previous"]',
  ) as HTMLElement;
  assert.equal(prev.getAttribute("aria-disabled"), "true");
  assert.equal(prev.hasAttribute("data-disabled"), true);
  click(prev);
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
});

test("clicking a day calls onDateActivate and nothing else (C6)", () => {
  const calls: string[] = [];
  const { root } = open({
    ...base,
    onDateActivate: (date, info) => calls.push(`${date.day} ${info.source}`),
  });
  click(root.querySelector('[data-chrono-key="2026-11-20"]') as Element);
  assert.deepEqual(calls, ["20 pointer"]);
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(
    root
      .querySelector('[data-chrono-key="2026-11-20"]')
      ?.getAttribute("tabindex"),
    "0",
  );
});

test("destroy removes the delegated listeners", () => {
  const { root, calendar } = open();
  calendar.destroy();
  click(root.querySelector('button[aria-label="Next"]') as Element);
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
});

test("applyAttributes sets present values and removes stale ones", () => {
  const element = document.createElement("td");
  applyAttributes(element, {
    role: "gridcell",
    "data-today": true,
    tabindex: 0,
    "data-disabled": false,
  });
  assert.equal(element.getAttribute("role"), "gridcell");
  assert.equal(element.getAttribute("data-today"), "");
  assert.equal(element.getAttribute("tabindex"), "0");
  assert.equal(element.hasAttribute("data-disabled"), false);
  applyAttributes(element, { role: "gridcell", tabindex: -1 });
  assert.equal(element.hasAttribute("data-today"), false);
  assert.equal(element.getAttribute("tabindex"), "-1");
});
