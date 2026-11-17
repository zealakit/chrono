import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { CalendarOptions } from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import { referenceCalendar } from "./support/reference.ts";
import { norm } from "./support/text.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};

beforeEach(resetDom);
afterEach(cleanup);

const cell = (container: Element, key: string) =>
  container.querySelector(
    `[data-chrono-key="${key}"]:not([data-outside-month])`,
  ) as HTMLElement;
const tabStops = (container: Element) =>
  [...container.querySelectorAll('[data-chrono-key][tabindex="0"]')].map((el) =>
    el.getAttribute("data-chrono-key"),
  );

test("roving tabindex: exactly one tab stop, on the focused day", () => {
  const { container } = render(referenceCalendar(base));
  assert.deepEqual(tabStops(container), ["2026-11-17"]);
  assert.equal(cell(container, "2026-11-18").getAttribute("tabindex"), "-1");
});

test("arrow, Home/End and Page keys move focus and tabindex", () => {
  const { container } = render(referenceCalendar(base));
  const start = cell(container, "2026-11-17");
  start.focus();
  const press = (key: string, options: object = {}) =>
    fireEvent.keyDown(document.activeElement ?? start, { key, ...options });
  press("ArrowRight");
  assert.deepEqual(tabStops(container), ["2026-11-18"]);
  assert.equal(document.activeElement, cell(container, "2026-11-18"));
  press("ArrowDown");
  assert.equal(document.activeElement, cell(container, "2026-11-25"));
  press("Home");
  assert.equal(document.activeElement, cell(container, "2026-11-23"));
  press("End");
  assert.equal(document.activeElement, cell(container, "2026-11-29"));
  press("ArrowLeft");
  press("ArrowUp");
  assert.equal(document.activeElement, cell(container, "2026-11-21"));
});

test("leaving the range navigates and keeps focus in the grid", () => {
  const calls: string[] = [];
  const { container } = render(
    referenceCalendar({
      ...base,
      onDateChange: (date) => calls.push(`${date.month}/${date.day}`),
    }),
  );
  cell(container, "2026-11-29").focus();
  fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
  assert.equal(container.querySelector("h2")?.textContent, "December 2026");
  assert.equal(document.activeElement, cell(container, "2026-12-06"));
  assert.deepEqual(calls, ["12/6"]);
  fireEvent.keyDown(document.activeElement as Element, { key: "PageUp" });
  assert.equal(container.querySelector("h2")?.textContent, "November 2026");
  assert.equal(document.activeElement, cell(container, "2026-11-06"));
  fireEvent.keyDown(document.activeElement as Element, {
    key: "PageDown",
    shiftKey: true,
  });
  assert.equal(container.querySelector("h2")?.textContent, "November 2027");
});

test("keys the calendar does not handle are not prevented; handled keys are", () => {
  const { container } = render(referenceCalendar(base));
  const start = cell(container, "2026-11-17");
  start.focus();
  assert.equal(fireEvent.keyDown(start, { key: "a" }), true);
  assert.equal(fireEvent.keyDown(start, { key: "ArrowRight" }), false);
  assert.equal(
    fireEvent.keyDown(start, { key: "ArrowRight", ctrlKey: true }),
    true,
  );
});

test("Enter activates the focused day", () => {
  const calls: string[] = [];
  const { container } = render(
    referenceCalendar({
      ...base,
      onDateActivate: (date, info) =>
        calls.push(`${date.day} ${info.source} ${info.view}`),
    }),
  );
  const start = cell(container, "2026-11-17");
  start.focus();
  fireEvent.keyDown(start, { key: "ArrowRight" });
  fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
  assert.deepEqual(calls, ["18 keyboard month"]);
});

test("pressing a nav button never steals focus into the grid", () => {
  const { container } = render(referenceCalendar(base));
  const next = container.querySelector(
    'button[aria-label="Next"]',
  ) as HTMLElement;
  next.focus();
  fireEvent.click(next);
  assert.equal(document.activeElement, next);
});

test("time grid column headers are the focusable row (C7)", () => {
  const { container } = render(
    referenceCalendar({ ...base, defaultView: "week" }),
  );
  assert.deepEqual(tabStops(container), ["2026-11-17"]);
  assert.equal(
    container.querySelectorAll("[data-slot-start][tabindex]").length,
    0,
  );
  const header = container.querySelector(
    '[role="columnheader"][data-chrono-key="2026-11-17"]',
  ) as HTMLElement;
  header.focus();
  fireEvent.keyDown(header, { key: "ArrowRight" });
  assert.equal(
    document.activeElement,
    container.querySelector(
      '[role="columnheader"][data-chrono-key="2026-11-18"]',
    ),
  );
  fireEvent.keyDown(document.activeElement as Element, { key: "End" });
  fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
  assert.equal(
    norm(container.querySelector("h2")?.textContent ?? ""),
    "Nov 23 – 29, 2026",
  );
  assert.equal(
    document.activeElement,
    container.querySelector(
      '[role="columnheader"][data-chrono-key="2026-11-23"]',
    ),
  );
});

test("agenda days take focus with up and down", () => {
  const { container } = render(
    referenceCalendar({ ...base, defaultView: "agenda" }),
  );
  const first = container.querySelector(
    'li[data-chrono-key="2026-11-17"]',
  ) as HTMLElement;
  first.focus();
  fireEvent.keyDown(first, { key: "ArrowDown" });
  assert.equal(
    document.activeElement,
    container.querySelector('li[data-chrono-key="2026-11-18"]'),
  );
});

test("RTL swaps left and right", () => {
  const { container } = render(referenceCalendar({ ...base, locale: "ar-EG" }));
  const start = cell(container, "2026-11-17");
  start.focus();
  fireEvent.keyDown(start, { key: "ArrowLeft" });
  assert.equal(document.activeElement, cell(container, "2026-11-18"));
});
