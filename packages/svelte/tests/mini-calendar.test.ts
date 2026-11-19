import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { parseIsoDate } from "@zealakit/chrono-core/foundation";
import {
  cleanupFixtures,
  entryUrl,
  miniSource,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = {
  id: "mini",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const d = parseIsoDate;
const live: Mounted[] = [];
const open = async (options: object, source = miniSource()) => {
  const mounted = await mountSource(source, options);
  live.push(mounted);
  return mounted;
};

afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

test("renders title and a 6-row grid; pages on its own", async () => {
  const { target } = await open(base);
  assert.equal(target.querySelector("h2")?.textContent, "November 2026");
  assert.equal(target.querySelectorAll("tbody tr").length, 6);
  click(target.querySelector('button[aria-label="Next"]') as Element);
  await settle();
  assert.equal(target.querySelector("h2")?.textContent, "December 2026");
});

test("marked days carry data-marked and a label suffix", async () => {
  const { target } = await open({
    ...base,
    isMarked: (date: { day: number; month: number }) =>
      date.day === 20 && date.month === 11,
  });
  const marked = target.querySelectorAll("[data-marked]");
  assert.equal(marked.length, 1);
  assert.equal(
    marked[0]?.getAttribute("aria-label"),
    "Friday, November 20, 2026, has events",
  );
});

test("onNavigate fires on click and Enter", async () => {
  const calls: string[] = [];
  const { target } = await open({
    ...base,
    onNavigate: (date: { month: number; day: number }) =>
      calls.push(`${date.month}/${date.day}`),
  });
  click(target.querySelector('[data-chrono-key="2026-11-20"]') as Element);
  await settle();
  const cell = target.querySelector(
    '[data-chrono-key="2026-11-20"]',
  ) as HTMLElement;
  cell.focus();
  press(cell, "ArrowRight");
  await settle();
  press(document.activeElement as Element, "Enter");
  await settle();
  assert.deepEqual(calls, ["11/20", "11/21"]);
});

test("syncWith follows the main calendar when its month changes (C11)", async () => {
  const mounted = await open({
    ...base,
    syncWith: {
      date: d("2026-11-17"),
      visibleRange: { start: d("2026-11-16"), end: d("2026-11-22") },
    },
  });
  assert.equal(
    mounted.target.querySelector("h2")?.textContent,
    "November 2026",
  );
  assert.equal(mounted.target.querySelectorAll("[data-in-range]").length, 7);
  await mounted.update({
    ...base,
    syncWith: {
      date: d("2027-01-05"),
      visibleRange: { start: d("2026-12-28"), end: d("2027-01-03") },
    },
  });
  assert.equal(mounted.target.querySelector("h2")?.textContent, "January 2027");
});

test("part outside MiniCalendar fails clearly", async () => {
  await assert.rejects(
    open(
      {},
      `<script>import { MiniCalendarTitle } from "${entryUrl}";</script><MiniCalendarTitle />`,
    ),
    /must be used inside <MiniCalendar>/,
  );
});
