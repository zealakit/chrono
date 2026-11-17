import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import {
  calendarSource,
  cleanupFixtures,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const live: Mounted[] = [];
const open = async (options: object = base) => {
  const mounted = await mountSource(calendarSource(), options);
  live.push(mounted);
  return mounted.target;
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
const key = async (target: Element, name: string, init: object = {}) => {
  const result = press(target, name, init);
  await settle();
  return result;
};

afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

test("roving tabindex: exactly one tab stop, on the focused day", async () => {
  const root = await open();
  assert.deepEqual(tabStops(root), ["2026-11-17"]);
  assert.equal(cell(root, "2026-11-18").getAttribute("tabindex"), "-1");
});

test("arrow and Home/End keys move focus and tabindex", async () => {
  const root = await open();
  cell(root, "2026-11-17").focus();
  await key(document.activeElement as Element, "ArrowRight");
  assert.deepEqual(tabStops(root), ["2026-11-18"]);
  assert.equal(activeKey(), "2026-11-18");
  await key(document.activeElement as Element, "ArrowDown");
  assert.equal(activeKey(), "2026-11-25");
  await key(document.activeElement as Element, "Home");
  assert.equal(activeKey(), "2026-11-23");
  await key(document.activeElement as Element, "End");
  assert.equal(activeKey(), "2026-11-29");
});

test("leaving the range navigates and keeps focus in the grid", async () => {
  const root = await open();
  cell(root, "2026-11-29").focus();
  await key(document.activeElement as Element, "ArrowDown");
  assert.equal(root.querySelector("h2")?.textContent, "December 2026");
  assert.equal(activeKey(), "2026-12-06");
  await key(document.activeElement as Element, "PageUp");
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(activeKey(), "2026-11-06");
});

test("unhandled keys are not prevented; handled keys are", async () => {
  const root = await open();
  const start = cell(root, "2026-11-17");
  start.focus();
  assert.equal(await key(start, "a"), true);
  assert.equal(await key(start, "ArrowRight"), false);
  assert.equal(
    await key(document.activeElement as Element, "ArrowRight", {
      ctrlKey: true,
    }),
    true,
  );
});

test("Enter activates the focused day", async () => {
  const calls: string[] = [];
  const root = await open({
    ...base,
    onDateActivate: (
      date: { day: number },
      info: { source: string; view: string },
    ) => calls.push(`${date.day} ${info.source} ${info.view}`),
  });
  cell(root, "2026-11-17").focus();
  await key(document.activeElement as Element, "ArrowRight");
  await key(document.activeElement as Element, "Enter");
  assert.deepEqual(calls, ["18 keyboard month"]);
});

test("pressing a nav button never steals focus into the grid", async () => {
  const root = await open();
  const next = root.querySelector('button[aria-label="Next"]') as HTMLElement;
  next.focus();
  click(next);
  await settle();
  assert.equal(document.activeElement?.getAttribute("aria-label"), "Next");
});

test("time grid slots are the focusable row (E13)", async () => {
  const root = await open({ ...base, defaultView: "week" });
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

test("agenda days take focus with up and down; RTL swaps left and right", async () => {
  const agenda = await open({ ...base, defaultView: "agenda" });
  const first = agenda.querySelector(
    'li[data-chrono-key="2026-11-17"]',
  ) as HTMLElement;
  first.focus();
  await key(first, "ArrowDown");
  assert.equal(activeKey(), "2026-11-18");
  const rtl = await open({ ...base, locale: "ar-EG" });
  const start = cell(rtl, "2026-11-17");
  start.focus();
  await key(start, "ArrowLeft");
  assert.equal(activeKey(), "2026-11-18");
});
