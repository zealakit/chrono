import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  type MiniCalendarOptions,
  Calendar,
  CalendarMonthGrid,
  CalendarNextButton,
  CalendarTitle,
  MiniCalendar,
  MiniCalendarGrid,
  MiniCalendarTitle,
} from "../dist/calendar/index.js";
import { parseIsoDate } from "@zealakit/chrono-core/foundation";
import { resetDom } from "./support/dom.ts";
import { referenceMini } from "./support/reference.ts";

const base: MiniCalendarOptions = {
  id: "mini",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
const d = parseIsoDate;

beforeEach(resetDom);
afterEach(cleanup);

test("renders title and a 6-row grid; pages on its own", () => {
  const { container } = render(referenceMini(base));
  assert.equal(container.querySelector("h2")?.textContent, "November 2026");
  assert.equal(container.querySelectorAll("tbody tr").length, 6);
  fireEvent.click(
    container.querySelector('button[aria-label="Next"]') as Element,
  );
  assert.equal(container.querySelector("h2")?.textContent, "December 2026");
});

test("marked days carry data-marked and a label suffix", () => {
  const { container } = render(
    referenceMini({
      ...base,
      isMarked: (date) => date.day === 20 && date.month === 11,
    }),
  );
  const marked = container.querySelectorAll("[data-marked]");
  assert.equal(marked.length, 1);
  assert.equal(
    marked[0]?.getAttribute("aria-label"),
    "Friday, November 20, 2026, has events",
  );
});

test("onNavigate fires on click and Enter", () => {
  const calls: string[] = [];
  const { container } = render(
    referenceMini({
      ...base,
      onNavigate: (date) => calls.push(`${date.month}/${date.day}`),
    }),
  );
  fireEvent.click(
    container.querySelector('[data-chrono-key="2026-11-20"]') as Element,
  );
  const cell = container.querySelector(
    '[data-chrono-key="2026-11-20"]',
  ) as HTMLElement;
  cell.focus();
  fireEvent.keyDown(cell, { key: "ArrowRight" });
  fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
  assert.deepEqual(calls, ["11/20", "11/21"]);
});

test("syncWith follows the main calendar when its month changes (C11)", () => {
  function Shell() {
    return h(
      Calendar,
      { ...base, id: "cal" },
      h(CalendarNextButton),
      h(CalendarTitle),
      h(CalendarMonthGrid),
    );
  }
  const main = render(h(Shell));
  fireEvent.click(
    main.container.querySelector('button[aria-label="Next"]') as Element,
  );
  assert.equal(
    main.container.querySelector("h2")?.textContent,
    "December 2026",
  );

  const mini = render(
    referenceMini({
      ...base,
      syncWith: {
        date: d("2026-11-17"),
        visibleRange: { start: d("2026-11-16"), end: d("2026-11-22") },
      },
    }),
  );
  assert.equal(
    mini.container.querySelector("h2")?.textContent,
    "November 2026",
  );
  assert.equal(mini.container.querySelectorAll("[data-in-range]").length, 7);
  mini.rerender(
    referenceMini({
      ...base,
      syncWith: {
        date: d("2027-01-05"),
        visibleRange: { start: d("2026-12-28"), end: d("2027-01-03") },
      },
    }),
  );
  assert.equal(mini.container.querySelector("h2")?.textContent, "January 2027");
});

test("part outside MiniCalendar fails clearly; part names stay stable", () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.throws(
      () => render(h(MiniCalendarTitle)),
      /must be used inside <MiniCalendar>/,
    );
    assert.throws(
      () => render(h(MiniCalendarGrid)),
      /must be used inside <MiniCalendar>/,
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(typeof MiniCalendar, "object");
});
