import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { parseIsoDate } from "@zealakit/chrono-core/foundation";
import { h, nextTick } from "vue";
import { MiniCalendarGrid, MiniCalendarTitle } from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { ReferenceMini } from "./support/reference.ts";
import { click, press } from "./support/scenarios.ts";

const base = {
  id: "mini",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const d = parseIsoDate;
const mounted: VueWrapper[] = [];
const mountMini = (options: Record<string, unknown>, extra: object = {}) => {
  const wrapper = mount(ReferenceMini, {
    props: { options, ...extra },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  return wrapper;
};

beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

test("renders title and a 6-row grid; pages on its own", async () => {
  const root = mountMini(base).element as Element;
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(root.querySelectorAll("tbody tr").length, 6);
  click(root.querySelector('button[aria-label="Next"]') as Element);
  await nextTick();
  assert.equal(root.querySelector("h2")?.textContent, "December 2026");
});

test("marked days carry data-marked and a label suffix", () => {
  const root = mountMini({
    ...base,
    isMarked: (date: { day: number; month: number }) =>
      date.day === 20 && date.month === 11,
  }).element as Element;
  const marked = root.querySelectorAll("[data-marked]");
  assert.equal(marked.length, 1);
  assert.equal(
    marked[0]?.getAttribute("aria-label"),
    "Friday, November 20, 2026, has events",
  );
});

test("navigate fires on click and Enter", async () => {
  const calls: string[] = [];
  const root = mountMini(base, {
    onNavigate: (date: { month: number; day: number }) =>
      calls.push(`${date.month}/${date.day}`),
  }).element as Element;
  click(root.querySelector('[data-chrono-key="2026-11-20"]') as Element);
  const cell = root.querySelector(
    '[data-chrono-key="2026-11-20"]',
  ) as HTMLElement;
  cell.focus();
  press(cell, "ArrowRight");
  await nextTick();
  await nextTick();
  press(document.activeElement as Element, "Enter");
  assert.deepEqual(calls, ["11/20", "11/21"]);
});

test("syncWith follows the main calendar when its month changes (C11)", async () => {
  const wrapper = mountMini({
    ...base,
    syncWith: {
      date: d("2026-11-17"),
      visibleRange: { start: d("2026-11-16"), end: d("2026-11-22") },
    },
  });
  const root = wrapper.element as Element;
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(root.querySelectorAll("[data-in-range]").length, 7);
  await wrapper.setProps({
    options: {
      ...base,
      syncWith: {
        date: d("2027-01-05"),
        visibleRange: { start: d("2026-12-28"), end: d("2027-01-03") },
      },
    },
  });
  await nextTick();
  assert.equal(root.querySelector("h2")?.textContent, "January 2027");
});

test("part outside MiniCalendar fails clearly", () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.throws(
      () => mount({ render: () => h(MiniCalendarTitle) }),
      /must be used inside <MiniCalendar>/,
    );
    assert.throws(
      () => mount({ render: () => h(MiniCalendarGrid) }),
      /must be used inside <MiniCalendar>/,
    );
  } finally {
    console.warn = warn;
  }
});
