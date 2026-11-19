import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { parseIsoDate } from "@zealakit/chrono-core/foundation";
import type { MiniCalendarOptions } from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { type MountedMini, mountMini } from "./support/reference.ts";
import { click, press } from "./support/scenarios.ts";

const base: MiniCalendarOptions = {
  id: "mini",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const d = parseIsoDate;
const live: MountedMini[] = [];
const open = (options: MiniCalendarOptions) => {
  const mounted = mountMini(options);
  live.push(mounted);
  return mounted;
};

beforeEach(resetDom);
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.mini.destroy();
});

test("renders title and a 6-row grid; pages on its own", () => {
  const { root } = open(base);
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(root.querySelectorAll("tbody tr").length, 6);
  click(root.querySelector('button[aria-label="Next"]') as Element);
  assert.equal(root.querySelector("h2")?.textContent, "December 2026");
});

test("marked days carry data-marked and a label suffix", () => {
  const { root } = open({
    ...base,
    isMarked: (date) => date.day === 20 && date.month === 11,
  });
  const marked = root.querySelectorAll("[data-marked]");
  assert.equal(marked.length, 1);
  assert.equal(
    marked[0]?.getAttribute("aria-label"),
    "Friday, November 20, 2026, has events",
  );
});

test("onNavigate fires on click and Enter", () => {
  const calls: string[] = [];
  const { root } = open({
    ...base,
    onNavigate: (date) => calls.push(`${date.month}/${date.day}`),
  });
  click(root.querySelector('[data-chrono-key="2026-11-20"]') as Element);
  const cell = root.querySelector(
    '[data-chrono-key="2026-11-20"]',
  ) as HTMLElement;
  cell.focus();
  press(cell, "ArrowRight");
  press(document.activeElement as Element, "Enter");
  assert.deepEqual(calls, ["11/20", "11/21"]);
});

test("syncWith follows the main calendar when its month changes (C11)", () => {
  const { root, mini } = open({
    ...base,
    syncWith: {
      date: d("2026-11-17"),
      visibleRange: { start: d("2026-11-16"), end: d("2026-11-22") },
    },
  });
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(root.querySelectorAll("[data-in-range]").length, 7);
  mini.setOptions({
    syncWith: {
      date: d("2027-01-05"),
      visibleRange: { start: d("2026-12-28"), end: d("2027-01-03") },
    },
  });
  assert.equal(root.querySelector("h2")?.textContent, "January 2027");
});
