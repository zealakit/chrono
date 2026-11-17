import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { resetDom } from "./support/dom.ts";
import { ReferenceCalendar } from "./support/reference.ts";
import { click, press } from "./support/scenarios.ts";
import { norm } from "./support/text.ts";

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const mounted: VueWrapper[] = [];
const mountRef = (
  options: Record<string, unknown> = base,
  extra: object = {},
) => {
  const wrapper = mount(ReferenceCalendar, {
    props: { options, ...extra },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper.element as Element;
};
const cell = (root: Element, key: string) =>
  root.querySelector(
    `[data-chrono-key="${key}"]:not([data-outside-month])`,
  ) as HTMLElement;
const tabStops = (root: Element) =>
  [...root.querySelectorAll('[data-chrono-key][tabindex="0"]')].map((x) =>
    x.getAttribute("data-chrono-key"),
  );
const key = async (target: Element, name: string, init: object = {}) => {
  const result = press(target, name, init);
  await nextTick();
  await nextTick();
  return result;
};

beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

test("roving tabindex: exactly one tab stop, on the focused day", () => {
  const root = mountRef();
  assert.deepEqual(tabStops(root), ["2026-11-17"]);
  assert.equal(cell(root, "2026-11-18").getAttribute("tabindex"), "-1");
});

test("arrow, Home/End keys move focus and tabindex", async () => {
  const root = mountRef();
  cell(root, "2026-11-17").focus();
  await key(document.activeElement as Element, "ArrowRight");
  assert.deepEqual(tabStops(root), ["2026-11-18"]);
  assert.equal(document.activeElement, cell(root, "2026-11-18"));
  await key(document.activeElement as Element, "ArrowDown");
  assert.equal(document.activeElement, cell(root, "2026-11-25"));
  await key(document.activeElement as Element, "Home");
  assert.equal(document.activeElement, cell(root, "2026-11-23"));
  await key(document.activeElement as Element, "End");
  assert.equal(document.activeElement, cell(root, "2026-11-29"));
});

test("leaving the range navigates and keeps focus in the grid", async () => {
  const root = mountRef();
  cell(root, "2026-11-29").focus();
  await key(document.activeElement as Element, "ArrowDown");
  assert.equal(root.querySelector("h2")?.textContent, "December 2026");
  assert.equal(document.activeElement, cell(root, "2026-12-06"));
  await key(document.activeElement as Element, "PageUp");
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(document.activeElement, cell(root, "2026-11-06"));
});

test("unhandled keys are not prevented; handled keys are", async () => {
  const root = mountRef();
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
  const root = mountRef(base, {
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
  const root = mountRef();
  const next = root.querySelector('button[aria-label="Next"]') as HTMLElement;
  next.focus();
  click(next);
  await nextTick();
  await nextTick();
  assert.equal(document.activeElement, next);
});

test("time grid column headers are the focusable row (C7)", async () => {
  const root = mountRef({ ...base, defaultView: "week" });
  assert.deepEqual(tabStops(root), ["2026-11-17"]);
  assert.equal(root.querySelectorAll("[data-slot-start][tabindex]").length, 0);
  const header = root.querySelector(
    '[role="columnheader"][data-chrono-key="2026-11-17"]',
  ) as HTMLElement;
  header.focus();
  await key(header, "ArrowRight");
  assert.equal(
    document.activeElement,
    root.querySelector('[role="columnheader"][data-chrono-key="2026-11-18"]'),
  );
  await key(document.activeElement as Element, "End");
  await key(document.activeElement as Element, "ArrowRight");
  assert.equal(
    norm(root.querySelector("h2")?.textContent ?? ""),
    "Nov 23 – 29, 2026",
  );
  assert.equal(
    document.activeElement,
    root.querySelector('[role="columnheader"][data-chrono-key="2026-11-23"]'),
  );
});

test("agenda days take focus with up and down; RTL swaps left and right", async () => {
  const agenda = mountRef({ ...base, defaultView: "agenda" });
  const first = agenda.querySelector(
    'li[data-chrono-key="2026-11-17"]',
  ) as HTMLElement;
  first.focus();
  await key(first, "ArrowDown");
  assert.equal(
    document.activeElement,
    agenda.querySelector('li[data-chrono-key="2026-11-18"]'),
  );
  const rtl = mountRef({ ...base, locale: "ar-EG" });
  const start = cell(rtl, "2026-11-17");
  start.focus();
  await key(start, "ArrowLeft");
  assert.equal(document.activeElement, cell(rtl, "2026-11-18"));
});
