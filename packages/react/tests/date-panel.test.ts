import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement as h, useState } from "react";
import {
  DatePanel,
  DatePanelCell,
  DatePanelGrid,
  DatePanelLevelButton,
  DatePanelNextButton,
  DatePanelPrevButton,
  DatePanelTitle,
  DatePanelTodayButton,
  DateRangePanel,
  MultiDatePanel,
} from "../dist/date/index.js";
import { plainDate } from "@zealakit/chrono-core/foundation";
import { resetDom } from "./support/dom.ts";

const base = {
  id: "p",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
} as const;

beforeEach(resetDom);
afterEach(cleanup);

const cell = (container: Element, key: string) =>
  container.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const title = (container: Element) =>
  container.querySelector("h2")?.textContent;

test("renders a grid with roving tabindex and selection state", () => {
  const { container } = render(
    h(DatePanel, { ...base, defaultValue: plainDate(2026, 11, 20) } as never),
  );
  assert.equal(title(container), "November 2026");
  assert.equal(
    container
      .querySelector("[role=grid]")
      ?.hasAttribute("aria-multiselectable"),
    false,
  );
  const tabStops = [
    ...container.querySelectorAll('[data-chrono-key][tabindex="0"]'),
  ];
  assert.equal(tabStops.length, 1);
  assert.equal(tabStops[0]?.getAttribute("data-chrono-key"), "2026-11-20");
  assert.equal(
    cell(container, "2026-11-20").getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    cell(container, "2026-11-21").getAttribute("aria-selected"),
    "false",
  );
  assert.equal(
    cell(container, "2026-11-17").getAttribute("aria-current"),
    "date",
  );
});

test("click picks and commits once; keyboard moves focus", () => {
  const commits: unknown[] = [];
  const { container } = render(
    h(DatePanel, {
      ...base,
      onValueCommit: (v: { day: number }) => commits.push(v.day),
    } as never),
  );
  fireEvent.click(cell(container, "2026-11-12"));
  assert.deepEqual(commits, [12]);
  cell(container, "2026-11-12").focus();
  fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
  assert.equal(document.activeElement, cell(container, "2026-11-13"));
  fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
  assert.deepEqual(commits, [12, 13]);
});

test("composition parts, paging and the level button", () => {
  const { container } = render(
    h(
      DatePanel,
      base as never,
      h(DatePanelPrevButton),
      h(DatePanelLevelButton),
      h(DatePanelNextButton),
      h(DatePanelTodayButton),
      h(DatePanelGrid),
    ),
  );
  const buttons = container.querySelectorAll("button");
  fireEvent.click(buttons[2] as Element);
  assert.equal(buttons[1]?.textContent, "December 2026");
  fireEvent.click(buttons[1] as Element);
  assert.equal(container.querySelectorAll("td[data-chrono-key]").length, 12);
  assert.equal(buttons[1]?.textContent, "2026");
  fireEvent.click(cell(container, "2026-03") as Element);
  assert.equal(buttons[1]?.textContent, "March 2026");
  fireEvent.click(buttons[3] as Element);
  assert.equal(buttons[1]?.textContent, "November 2026");
});

test("custom cell content through the grid render function", () => {
  const { container } = render(
    h(
      DatePanel,
      base as never,
      h(DatePanelGrid, {
        children: (day: { date: { day: number } }) => `d${day.date.day}`,
      }),
    ),
  );
  assert.equal(cell(container, "2026-11-05").textContent, "d5");
});

test("range panel: two months, preview on hover, blocked days, commit", () => {
  const commits: string[] = [];
  const { container } = render(
    h(DateRangePanel, {
      ...base,
      maxDays: 5,
      onValueCommit: (r: { start: { day: number }; end: { day: number } }) =>
        commits.push(`${r.start.day}-${r.end.day}`),
    } as never),
  );
  assert.equal(container.querySelectorAll("table").length, 2);
  fireEvent.click(cell(container, "2026-11-10"));
  assert.equal(
    cell(container, "2026-11-20").hasAttribute("data-range-blocked"),
    true,
  );
  fireEvent.mouseEnter(cell(container, "2026-11-12"));
  assert.equal(
    cell(container, "2026-11-11").hasAttribute("data-range-preview"),
    true,
  );
  fireEvent.click(cell(container, "2026-11-20"));
  assert.deepEqual(commits, []);
  fireEvent.click(cell(container, "2026-11-12"));
  assert.deepEqual(commits, ["10-12"]);
  assert.equal(
    cell(container, "2026-11-11").hasAttribute("data-in-range"),
    true,
  );
});

test("Escape bubbles unless it cancels a draft (A18)", () => {
  let seen = 0;
  const { container } = render(
    h(
      "div",
      {
        onKeyDown: () => {
          seen += 1;
        },
      },
      h(DateRangePanel, base as never),
    ),
  );
  cell(container, "2026-11-10").focus();
  fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
  assert.equal(seen, 1);
  fireEvent.click(cell(container, "2026-11-10"));
  fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
  assert.equal(seen, 1);
  assert.equal(container.querySelectorAll("[data-range-start]").length, 0);
});

test("multi panel: shift-click adds a span, maxSelected blocks the rest", () => {
  const { container } = render(
    h(MultiDatePanel, { ...base, maxSelected: 4 } as never),
  );
  fireEvent.click(cell(container, "2026-11-03"));
  fireEvent.click(cell(container, "2026-11-05"), { shiftKey: true });
  assert.equal(container.querySelectorAll('[aria-selected="true"]').length, 3);
  fireEvent.click(cell(container, "2026-11-10"));
  assert.equal(
    cell(container, "2026-11-11").hasAttribute("data-range-blocked"),
    true,
  );
});

test("autoFocus is opt-in and runs after mount", () => {
  const off = render(h(DatePanel, base as never));
  assert.notEqual(document.activeElement, cell(off.container, "2026-11-17"));
  cleanup();
  const on = render(h(DatePanel, { ...base, autoFocus: true } as never));
  assert.equal(document.activeElement, cell(on.container, "2026-11-17"));
});

test("controlled value and follow-value", () => {
  function Controlled() {
    const [value, setValue] = useState<unknown>(null);
    return h(
      "div",
      null,
      h(
        "button",
        {
          id: "go",
          type: "button",
          onClick: () => setValue(plainDate(2027, 3, 9)),
        },
        "go",
      ),
      h(DatePanel, { ...base, value, onValueChange: setValue } as never),
    );
  }
  const { container } = render(h(Controlled));
  fireEvent.click(container.querySelector("#go") as Element);
  assert.equal(title(container), "March 2027");
  assert.equal(
    cell(container, "2027-03-09").getAttribute("aria-selected"),
    "true",
  );
});

test("a Chrono-free consumer class is kept; no styles from Chrono", () => {
  const { container } = render(
    h(DatePanel, { ...base, className: "mine" } as never),
  );
  assert.equal(container.querySelectorAll("[style]").length, 0);
  assert.equal(container.querySelectorAll("[class]").length, 1);
});

test("parts throw outside a panel", () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.throws(() => render(h(DatePanelTitle)), /must be used inside/);
    assert.throws(
      () => render(h(DatePanelCell, { day: {} } as never)),
      /must be used inside/,
    );
  } finally {
    console.error = original;
  }
});
