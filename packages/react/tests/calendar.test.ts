import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  Calendar,
  CalendarCell,
  CalendarMonthGrid,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTitle,
  CalendarViewButton,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { norm } from "./support/text.ts";
import { referenceCalendar } from "./support/reference.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};

beforeEach(resetDom);
afterEach(cleanup);

test("renders month view with title, buttons and a grid, without a Provider", () => {
  const { container, getByRole } = render(referenceCalendar(base));
  assert.equal(container.querySelector("h2")?.textContent, "November 2026");
  assert.equal(container.querySelectorAll('table[role="grid"]').length, 1);
  assert.equal(container.querySelectorAll("td[role=gridcell]").length, 42);
  assert.ok(getByRole("button", { name: "Next" }));
  const root = container.querySelector("[data-chrono-calendar]");
  assert.equal(root?.getAttribute("data-view"), "month");
  assert.equal(root?.getAttribute("dir"), "ltr");
  assert.equal(
    container
      .querySelector('button[data-view="month"]')
      ?.getAttribute("aria-pressed"),
    "true",
  );
});

test("prev, next and today buttons navigate", () => {
  const { container } = render(referenceCalendar(base));
  const click = (label: string) =>
    fireEvent.click(
      container.querySelector(`button[aria-label="${label}"]`) as Element,
    );
  click("Next");
  assert.equal(container.querySelector("h2")?.textContent, "December 2026");
  click("Previous");
  click("Previous");
  assert.equal(container.querySelector("h2")?.textContent, "October 2026");
  click("Today");
  assert.equal(container.querySelector("h2")?.textContent, "November 2026");
});

test("view buttons switch every layout", () => {
  const { container } = render(referenceCalendar(base));
  const view = (id: string) =>
    fireEvent.click(
      container.querySelector(`button[data-view="${id}"]`) as Element,
    );
  view("week");
  assert.equal(
    norm(container.querySelector("h2")?.textContent ?? ""),
    "Nov 16 – 22, 2026",
  );
  assert.equal(container.querySelectorAll('[role="columnheader"]').length, 7);
  assert.equal(container.querySelectorAll("[data-slot-start]").length, 7 * 48);
  view("workWeek");
  assert.equal(container.querySelectorAll('[role="columnheader"]').length, 5);
  view("agenda");
  assert.equal(container.querySelectorAll('li[role="listitem"]').length, 7);
  view("multiMonth");
  assert.equal(container.querySelectorAll('table[role="grid"]').length, 3);
  assert.equal(
    container
      .querySelectorAll('table[role="grid"]')[1]
      ?.getAttribute("aria-label"),
    "December 2026",
  );
  view("day");
  assert.equal(container.querySelectorAll('[role="columnheader"]').length, 1);
});

test("uncontrolled view and date call their handlers", () => {
  const views: string[] = [];
  const dates: number[] = [];
  const { container } = render(
    referenceCalendar({
      ...base,
      onViewChange: (v) => views.push(v),
      onDateChange: (d) => dates.push(d.day),
    }),
  );
  fireEvent.click(
    container.querySelector('button[data-view="week"]') as Element,
  );
  fireEvent.click(
    container.querySelector('button[aria-label="Next"]') as Element,
  );
  assert.deepEqual(views, ["week"]);
  assert.deepEqual(dates, [24]);
});

test("controlled view and date follow the props, not the clicks", () => {
  const views: string[] = [];
  const view = render(
    referenceCalendar({
      ...base,
      view: "month",
      date: "2026-11-17",
      onViewChange: (v) => views.push(v),
    }),
  );
  fireEvent.click(
    view.container.querySelector('button[data-view="week"]') as Element,
  );
  assert.equal(
    view.container
      .querySelector("[data-chrono-calendar]")
      ?.getAttribute("data-view"),
    "month",
  );
  assert.deepEqual(views, ["week"]);
  view.rerender(
    referenceCalendar({
      ...base,
      view: "week",
      date: "2026-12-17",
      onViewChange: (v) => views.push(v),
    }),
  );
  assert.equal(
    view.container
      .querySelector("[data-chrono-calendar]")
      ?.getAttribute("data-view"),
    "week",
  );
  assert.equal(
    norm(view.container.querySelector("h2")?.textContent ?? ""),
    "Dec 14 – 20, 2026",
  );
});

test("onVisibleRangeChange fires once after mount and on real changes", () => {
  const calls: string[] = [];
  const { container } = render(
    referenceCalendar({
      ...base,
      onVisibleRangeChange: (range, info) =>
        calls.push(`${info.view} ${range.start.month}/${range.start.day}`),
    }),
  );
  assert.deepEqual(calls, ["month 10/26"]);
  fireEvent.click(
    container.querySelector('button[aria-label="Next"]') as Element,
  );
  assert.deepEqual(calls, ["month 10/26", "month 11/30"]);
});

test("min and max disable the nav buttons", () => {
  const { container } = render(
    referenceCalendar({ ...base, min: "2026-11-10" }),
  );
  const prev = container.querySelector(
    'button[aria-label="Previous"]',
  ) as HTMLElement;
  assert.equal(prev.getAttribute("aria-disabled"), "true");
  assert.equal(prev.hasAttribute("data-disabled"), true);
  fireEvent.click(prev);
  assert.equal(container.querySelector("h2")?.textContent, "November 2026");
});

test("clicking a day calls onDateActivate and nothing else (C6)", () => {
  const calls: string[] = [];
  const { container } = render(
    referenceCalendar({
      ...base,
      onDateActivate: (date, info) => calls.push(`${date.day} ${info.source}`),
    }),
  );
  fireEvent.click(
    container.querySelector('[data-chrono-key="2026-11-20"]') as Element,
  );
  assert.deepEqual(calls, ["20 pointer"]);
  assert.equal(container.querySelector("h2")?.textContent, "November 2026");
  assert.equal(
    container
      .querySelector('[data-chrono-key="2026-11-20"]')
      ?.getAttribute("tabindex"),
    "0",
  );
});

test("consumer props merge: class and handlers stay, contract attributes win", () => {
  const clicks: string[] = [];
  const { container } = render(
    h(
      Calendar,
      { ...base, className: "my-calendar", "data-view": "ignored" } as never,
      h(CalendarPrevButton, {
        className: "prev",
        "aria-label": "ignored",
        onClick: () => clicks.push("consumer"),
      }),
      h(
        CalendarNextButton,
        { asChild: true },
        h("a", { href: "#next", className: "link" }, "Next"),
      ),
      h(CalendarTitle, { className: "title" }),
      h(CalendarViewButton, { view: "week" }),
      h(CalendarMonthGrid, {
        children: (day) => h("span", { className: "num" }, day.date.day),
      }),
    ),
  );
  assert.equal(
    container.querySelector("[data-chrono-calendar]")?.className,
    "my-calendar",
  );
  assert.equal(
    container
      .querySelector("[data-chrono-calendar]")
      ?.getAttribute("data-view"),
    "month",
  );
  const prev = container.querySelector("button.prev") as HTMLElement;
  assert.equal(prev.getAttribute("aria-label"), "Previous");
  fireEvent.click(prev);
  assert.deepEqual(clicks, ["consumer"]);
  assert.equal(container.querySelector("h2")?.textContent, "October 2026");
  const link = container.querySelector("a.link") as HTMLElement;
  assert.equal(link.tagName, "A");
  assert.equal(link.getAttribute("aria-label"), "Next");
  fireEvent.click(link);
  assert.equal(container.querySelector("h2")?.textContent, "November 2026");
  assert.equal(container.querySelector("td span.num")?.textContent, "26");
});

test("a part outside Calendar fails with a clear message", () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.throws(
      () => render(h(CalendarCell, { day: {} as never })),
      /must be used inside <Calendar>/,
    );
  } finally {
    console.error = originalError;
  }
});
