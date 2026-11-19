import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { h, nextTick } from "vue";
import {
  Calendar,
  CalendarCell,
  CalendarMonthGrid,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTitle,
  CalendarViewButton,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { ReferenceCalendar } from "./support/reference.ts";
import { click } from "./support/scenarios.ts";
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
  return wrapper;
};
const el = (wrapper: VueWrapper) => wrapper.element as Element;

beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

test("renders month view with title, buttons and a grid, without a Provider", () => {
  const root = el(mountRef());
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(root.querySelectorAll('table[role="grid"]').length, 1);
  assert.equal(root.querySelectorAll("td[role=gridcell]").length, 42);
  const calendar = root;
  assert.equal(calendar?.getAttribute("data-view"), "month");
  assert.equal(calendar?.getAttribute("dir"), "ltr");
  assert.equal(
    root
      .querySelector('button[data-view="month"]')
      ?.getAttribute("aria-pressed"),
    "true",
  );
});

test("prev, next and today buttons navigate", async () => {
  const root = el(mountRef());
  const press = async (label: string) => {
    click(root.querySelector(`button[aria-label="${label}"]`) as Element);
    await nextTick();
  };
  await press("Next");
  assert.equal(root.querySelector("h2")?.textContent, "December 2026");
  await press("Previous");
  await press("Previous");
  assert.equal(root.querySelector("h2")?.textContent, "October 2026");
  await press("Today");
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
});

test("view buttons switch every layout", async () => {
  const root = el(mountRef());
  const view = async (id: string) => {
    click(root.querySelector(`button[data-view="${id}"]`) as Element);
    await nextTick();
  };
  await view("week");
  assert.equal(
    norm(root.querySelector("h2")?.textContent ?? ""),
    "Nov 16 – 22, 2026",
  );
  assert.equal(root.querySelectorAll('[role="columnheader"]').length, 7);
  assert.equal(root.querySelectorAll("[data-slot-start]").length, 7 * 48);
  await view("workWeek");
  assert.equal(root.querySelectorAll('[role="columnheader"]').length, 5);
  await view("agenda");
  assert.equal(root.querySelectorAll('li[role="listitem"]').length, 7);
  await view("multiMonth");
  assert.equal(root.querySelectorAll('table[role="grid"]').length, 3);
  assert.equal(
    root.querySelectorAll('table[role="grid"]')[1]?.getAttribute("aria-label"),
    "December 2026",
  );
  await view("day");
  assert.equal(root.querySelectorAll('[role="columnheader"]').length, 1);
});

test("uncontrolled: v-model events fire; controlled: props win", async () => {
  const views: string[] = [];
  const dates: number[] = [];
  const wrapper = mountRef(base, {
    "onUpdate:view": (v: string) => views.push(v),
    "onUpdate:date": (d: { day: number }) => dates.push(d.day),
  });
  const root = el(wrapper);
  click(root.querySelector('button[data-view="week"]') as Element);
  await nextTick();
  click(root.querySelector('button[aria-label="Next"]') as Element);
  await nextTick();
  assert.deepEqual(views, ["week"]);
  assert.deepEqual(dates, [24]);

  const controlled = mountRef(
    { ...base, view: "month", date: "2026-11-17" },
    { "onUpdate:view": (v: string) => views.push(v) },
  );
  const controlledRoot = el(controlled);
  click(controlledRoot.querySelector('button[data-view="week"]') as Element);
  await nextTick();
  assert.equal(controlledRoot.getAttribute("data-view"), "month");
  await controlled.setProps({
    options: { ...base, view: "week", date: "2026-12-17" },
  });
  await nextTick();
  assert.equal(
    norm(controlledRoot.querySelector("h2")?.textContent ?? ""),
    "Dec 14 – 20, 2026",
  );
});

test("onVisibleRangeChange fires once after mount and on real changes", async () => {
  const calls: string[] = [];
  const wrapper = mountRef(base, {
    onVisibleRangeChange: (
      range: { start: { month: number; day: number } },
      info: { view: string },
    ) => calls.push(`${info.view} ${range.start.month}/${range.start.day}`),
  });
  await nextTick();
  assert.deepEqual(calls, ["month 10/26"]);
  click(el(wrapper).querySelector('button[aria-label="Next"]') as Element);
  await nextTick();
  assert.deepEqual(calls, ["month 10/26", "month 11/30"]);
});

test("min disables the previous button", async () => {
  const root = el(mountRef({ ...base, min: "2026-11-10" }));
  const prev = root.querySelector(
    'button[aria-label="Previous"]',
  ) as HTMLElement;
  assert.equal(prev.getAttribute("aria-disabled"), "true");
  assert.equal(prev.hasAttribute("data-disabled"), true);
  click(prev);
  await nextTick();
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
});

test("clicking a day calls dateActivate and nothing else (C6)", async () => {
  const calls: string[] = [];
  const root = el(
    mountRef(base, {
      onDateActivate: (date: { day: number }, info: { source: string }) =>
        calls.push(`${date.day} ${info.source}`),
    }),
  );
  click(root.querySelector('[data-chrono-key="2026-11-20"]') as Element);
  await nextTick();
  assert.deepEqual(calls, ["20 pointer"]);
  assert.equal(root.querySelector("h2")?.textContent, "November 2026");
  assert.equal(
    root
      .querySelector('[data-chrono-key="2026-11-20"]')
      ?.getAttribute("tabindex"),
    "0",
  );
});

test("consumer attrs merge: class and listeners stay, contract attributes win", async () => {
  const clicks: string[] = [];
  const wrapper = mount(
    {
      render: () =>
        h(
          Calendar,
          { ...base, class: "my-calendar", "data-view": "ignored" } as never,
          () => [
            h(CalendarPrevButton, {
              class: "prev",
              "aria-label": "ignored",
              onClick: () => clicks.push("consumer"),
            }),
            h(CalendarNextButton),
            h(CalendarTitle, { class: "title" }),
            h(CalendarViewButton, { view: "week" }),
            h(CalendarMonthGrid, null, {
              default: ({ day }: { day: { date: { day: number } } }) =>
                h("span", { class: "num" }, String(day.date.day)),
            }),
          ],
        ),
    },
    { attachTo: document.body },
  );
  const root = wrapper.element as Element;
  assert.equal(root.className, "my-calendar");
  assert.equal(root.getAttribute("data-view"), "month");
  const prev = root.querySelector("button.prev") as HTMLElement;
  assert.equal(prev.getAttribute("aria-label"), "Previous");
  click(prev);
  await nextTick();
  assert.deepEqual(clicks, ["consumer"]);
  assert.equal(root.querySelector("h2")?.textContent, "October 2026");
  assert.equal(root.querySelector("td span.num")?.textContent, "28"); // Sep 28 opens the October grid
  wrapper.unmount();
});

test("a part outside Calendar fails with a clear message", () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.throws(
      () => mount(CalendarCell, { props: { day: {} as never } }),
      /must be used inside <Calendar>/,
    );
  } finally {
    console.warn = warn;
  }
});
