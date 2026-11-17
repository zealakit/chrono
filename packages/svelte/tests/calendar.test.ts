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
import { click } from "./support/scenarios.ts";
import { norm } from "./support/text.ts";

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const live: Mounted[] = [];
const open = async (options: object = base, source = calendarSource()) => {
  const mounted = await mountSource(source, options);
  live.push(mounted);
  return mounted;
};

afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

test("renders month view with title, buttons and a grid, without a Provider", async () => {
  const { target } = await open();
  assert.equal(target.querySelector("h2")?.textContent, "November 2026");
  assert.equal(target.querySelectorAll('table[role="grid"]').length, 1);
  assert.equal(target.querySelectorAll("td[role=gridcell]").length, 42);
  const root = target.querySelector("[data-chrono-calendar]");
  assert.equal(root?.getAttribute("data-view"), "month");
  assert.equal(root?.getAttribute("dir"), "ltr");
  assert.equal(
    target
      .querySelector('button[data-view="month"]')
      ?.getAttribute("aria-pressed"),
    "true",
  );
});

test("prev, next and today buttons navigate", async () => {
  const { target } = await open();
  const press = async (label: string) => {
    click(target.querySelector(`button[aria-label="${label}"]`) as Element);
    await settle();
  };
  await press("Next");
  assert.equal(target.querySelector("h2")?.textContent, "December 2026");
  await press("Previous");
  await press("Previous");
  assert.equal(target.querySelector("h2")?.textContent, "October 2026");
  await press("Today");
  assert.equal(target.querySelector("h2")?.textContent, "November 2026");
});

test("view buttons switch every layout", async () => {
  const { target } = await open();
  const view = async (id: string) => {
    click(target.querySelector(`button[data-view="${id}"]`) as Element);
    await settle();
  };
  await view("week");
  assert.equal(
    norm(target.querySelector("h2")?.textContent ?? ""),
    "Nov 16 – 22, 2026",
  );
  assert.equal(
    target.querySelectorAll('[role="columnheader"][data-chrono-key]').length,
    7,
  );
  assert.equal(target.querySelectorAll("[data-slot-start]").length, 7 * 48);
  await view("workWeek");
  assert.equal(
    target.querySelectorAll('[role="columnheader"][data-chrono-key]').length,
    5,
  );
  await view("agenda");
  assert.equal(target.querySelectorAll('li[role="listitem"]').length, 7);
  await view("multiMonth");
  assert.equal(target.querySelectorAll('table[role="grid"]').length, 3);
  assert.equal(
    target
      .querySelectorAll('table[role="grid"]')[1]
      ?.getAttribute("aria-label"),
    "December 2026",
  );
  await view("day");
  assert.equal(
    target.querySelectorAll('[role="columnheader"][data-chrono-key]').length,
    1,
  );
});

test("handlers fire; controlled props win until the app updates them", async () => {
  const views: string[] = [];
  const dates: number[] = [];
  const first = await open({
    ...base,
    onViewChange: (v: string) => views.push(v),
    onDateChange: (d: { day: number }) => dates.push(d.day),
  });
  click(first.target.querySelector('button[data-view="week"]') as Element);
  await settle();
  click(first.target.querySelector('button[aria-label="Next"]') as Element);
  await settle();
  assert.deepEqual(views, ["week"]);
  assert.deepEqual(dates, [24]);

  const second = await open({ ...base, view: "month", date: "2026-11-17" });
  await second.update({ ...base, view: "week", date: "2026-12-17" });
  assert.equal(
    norm(second.target.querySelector("h2")?.textContent ?? ""),
    "Dec 14 – 20, 2026",
  );
});

test("onVisibleRangeChange fires once after mount and on real changes", async () => {
  const calls: string[] = [];
  const { target } = await open({
    ...base,
    onVisibleRangeChange: (
      range: { start: { month: number; day: number } },
      info: { view: string },
    ) => calls.push(`${info.view} ${range.start.month}/${range.start.day}`),
  });
  assert.deepEqual(calls, ["month 10/26"]);
  click(target.querySelector('button[aria-label="Next"]') as Element);
  await settle();
  assert.deepEqual(calls, ["month 10/26", "month 11/30"]);
});

test("min disables the previous button", async () => {
  const { target } = await open({ ...base, min: "2026-11-10" });
  const prev = target.querySelector(
    'button[aria-label="Previous"]',
  ) as HTMLElement;
  assert.equal(prev.getAttribute("aria-disabled"), "true");
  assert.equal(prev.hasAttribute("data-disabled"), true);
  click(prev);
  await settle();
  assert.equal(target.querySelector("h2")?.textContent, "November 2026");
});

test("clicking a day calls onDateActivate and nothing else (C6)", async () => {
  const calls: string[] = [];
  const { target } = await open({
    ...base,
    onDateActivate: (date: { day: number }, info: { source: string }) =>
      calls.push(`${date.day} ${info.source}`),
  });
  click(target.querySelector('[data-chrono-key="2026-11-20"]') as Element);
  await settle();
  assert.deepEqual(calls, ["20 pointer"]);
  assert.equal(target.querySelector("h2")?.textContent, "November 2026");
  assert.equal(
    target
      .querySelector('[data-chrono-key="2026-11-20"]')
      ?.getAttribute("tabindex"),
    "0",
  );
});

test("consumer props merge: class and handlers stay, contract attributes win", async () => {
  const clicks: string[] = [];
  (globalThis as { __clicks?: string[] }).__clicks = clicks;
  const source = `
    <script>
      import { Calendar, CalendarMonthGrid, CalendarPrevButton, CalendarTitle } from "${(await import("./support/reference.ts")).entryUrl}";
    </script>
    <Calendar id="cal" locale="en-US" timeZone="UTC" now={${Date.UTC(2026, 10, 17, 12)}} weekStartsOn={1} class="my-calendar" data-view="ignored">
      <CalendarPrevButton class="prev" aria-label="ignored" onclick={() => globalThis.__clicks.push("consumer")} />
      <CalendarTitle class="title" />
      <CalendarMonthGrid>{#snippet children(day)}<span class="num">{day.date.day}</span>{/snippet}</CalendarMonthGrid>
    </Calendar>`;
  const { target } = await open({}, source);
  const root = target.querySelector("[data-chrono-calendar]") as Element;
  assert.equal(root.className, "my-calendar");
  assert.equal(root.getAttribute("data-view"), "month");
  const prev = target.querySelector("button.prev") as HTMLElement;
  assert.equal(prev.getAttribute("aria-label"), "Previous");
  click(prev);
  await settle();
  assert.deepEqual(clicks, ["consumer"]);
  assert.equal(target.querySelector("h2")?.textContent, "October 2026");
  assert.equal(target.querySelector("td span.num")?.textContent, "28");
});

test("a part outside Calendar fails with a clear message", async () => {
  const entry = (await import("./support/reference.ts")).entryUrl;
  await assert.rejects(
    open(
      {},
      `<script>import { CalendarTitle } from "${entry}";</script><CalendarTitle />`,
    ),
    /must be used inside <Calendar>/,
  );
});
