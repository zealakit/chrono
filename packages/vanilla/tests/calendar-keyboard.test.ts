import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { CalendarOptions } from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { type Mounted, mountCalendar } from "./support/reference.ts";
import { click, press } from "./support/scenarios.ts";

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
  return mounted.root;
};
const cell = (root: Element, key: string) =>
  root.querySelector(
    `[data-chrono-key="${key}"]:not([data-outside-month])`,
  ) as HTMLElement;
const activeKey = () =>
  document.activeElement?.getAttribute("data-chrono-key") ??
  document.activeElement?.tagName;
const tabStops = (root: Element) =>
  [...root.querySelectorAll('[data-chrono-key][tabindex="0"]')].map((x) =>
    x.getAttribute("data-chrono-key"),
  );

beforeEach(resetDom);
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.calendar.destroy();
});

test("roving tabindex: exactly one tab stop, on the focused day", () => {
  const root = open();
  assert.deepEqual(tabStops(root), ["2026-11-17"]);
  assert.equal(cell(root, "2026-11-18").getAttribute("tabindex"), "-1");
});

test("arrow and Home/End keys move focus and tabindex", () => {
  const root = open();
  cell(root, "2026-11-17").focus();
  press(document.activeElement as Element, "ArrowRight");
  assert.deepEqual(tabStops(root), ["2026-11-18"]);
  assert.equal(activeKey(), "2026-11-18");
  press(document.activeElement as Element, "ArrowDown");
  assert.equal(activeKey(), "2026-11-25");
  press(document.activeElement as Element, "Home");
  assert.equal(activeKey(), "2026-11-23");
  press(document.activeElement as Element, "End");
  assert.equal(activeKey(), "2026-11-29");
});

test("leaving the range navigates and keeps focus in the grid", () => {
  const root = open();
  cell(root, "2026-11-29").focus();
  press(document.activeElement as Element, "ArrowDown");
  assert.equal(root.querySelector("h2")?.textContent, "December 2026");
  assert.equal(activeKey(), "2026-12-06");
  press(document.activeElement as Element, "PageUp");
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(activeKey(), "2026-11-06");
});

test("unhandled keys are not prevented; handled keys are", () => {
  const root = open();
  const start = cell(root, "2026-11-17");
  start.focus();
  assert.equal(press(start, "a"), true);
  assert.equal(press(start, "ArrowRight"), false);
  assert.equal(
    press(document.activeElement as Element, "ArrowRight", { ctrlKey: true }),
    true,
  );
});

test("Enter activates the focused day", () => {
  const calls: string[] = [];
  const root = open({
    ...base,
    onDateActivate: (date, info) =>
      calls.push(`${date.day} ${info.source} ${info.view}`),
  });
  cell(root, "2026-11-17").focus();
  press(document.activeElement as Element, "ArrowRight");
  press(document.activeElement as Element, "Enter");
  assert.deepEqual(calls, ["18 keyboard month"]);
});

test("pressing a nav button never steals focus into the grid", () => {
  const root = open();
  const next = root.querySelector('button[aria-label="Next"]') as HTMLElement;
  next.focus();
  click(next);
  // (The reference template re-renders everything, so the button itself may be gone; focus never jumps into the grid.)
  assert.equal(
    document.activeElement?.hasAttribute("data-chrono-key") ?? false,
    false,
  );
});

test("time grid slots are the focusable row (E13)", () => {
  const root = open({ ...base, defaultView: "week" });
  assert.deepEqual(tabStops(root), ["2026-11-17T00:00:00"]);
  assert.equal(
    root.querySelectorAll('[role="columnheader"][data-chrono-key]').length,
    0,
  );
  assert.equal(
    root.querySelectorAll('[role="columnheader"][tabindex]').length,
    0,
  );
  assert.equal(
    root.querySelectorAll('[data-chrono-key*="T"][tabindex]').length,
    7 * 48,
  );
});

test("agenda days take focus with up and down; RTL swaps left and right", () => {
  const agenda = open({ ...base, defaultView: "agenda" });
  const first = agenda.querySelector(
    'li[data-chrono-key="2026-11-17"]',
  ) as HTMLElement;
  first.focus();
  press(first, "ArrowDown");
  assert.equal(activeKey(), "2026-11-18");
  const rtl = open({ ...base, locale: "ar-EG" });
  const start = cell(rtl, "2026-11-17");
  start.focus();
  press(start, "ArrowLeft");
  assert.equal(activeKey(), "2026-11-18");
});
