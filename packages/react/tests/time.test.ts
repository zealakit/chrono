import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { plainTime } from "@zealakit/chrono-core/foundation";
import { createElement as h, useState } from "react";
import {
  TimeInput,
  TimeInputClearButton,
  TimePanel,
  TimePanelColumn,
  TimePanelList,
  TimePanelOption,
  TimeRangeInput,
  TimeRangePanel,
} from "../dist/time/index.js";
import { resetDom } from "./support/dom.ts";

const base = {
  id: "t",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 9, 10),
} as const;
beforeEach(resetDom);
afterEach(cleanup);

const opt = (root: Element, key: string) =>
  root.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const press = (text: string) => {
  for (const key of text)
    fireEvent.keyDown(document.activeElement as Element, { key });
};

test("columns panel: listboxes, one tab stop, pick commits on the last column", () => {
  const commits: number[] = [];
  const { container } = render(
    h(TimePanel, {
      ...base,
      onValueCommit: (v: { hour: number }) => commits.push(v.hour),
    } as never),
  );
  assert.equal(container.querySelectorAll('[role="listbox"]').length, 3);
  assert.equal(
    container.querySelectorAll('[role="option"][tabindex="0"]').length,
    1,
  );
  fireEvent.click(opt(container, "hour:9"));
  fireEvent.click(opt(container, "minute:30"));
  assert.deepEqual(commits, []);
  fireEvent.click(opt(container, "dayPeriod:1"));
  assert.deepEqual(commits, [21]);
  assert.equal(opt(container, "hour:9").getAttribute("aria-selected"), "true");
});

test("columns panel: keyboard moves focus and Enter picks", () => {
  const { container } = render(
    h(TimePanel, { ...base, hourCycle: "h23" } as never),
  );
  opt(container, "hour:0").focus();
  fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
  assert.equal(document.activeElement, opt(container, "hour:1"));
  fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
  assert.equal(document.activeElement, opt(container, "minute:1"));
  fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
  assert.equal(
    opt(container, "minute:1").getAttribute("aria-selected"),
    "true",
  );
});

test("list panel: groups, unavailable slots, slot data in custom content", () => {
  const { container } = render(
    h(TimePanel, {
      ...base,
      layout: "list",
      start: "09:00",
      end: "12:00",
      slotDuration: 30,
      groupBy: "hour",
      slots: [
        { start: "09:00", data: { who: "Ann" } },
        { start: "09:30", available: false },
      ],
    } as never),
  );
  assert.equal(
    container.querySelectorAll('[role="group"] [role="option"]').length,
    2,
  );
  assert.equal(opt(container, "09:30").getAttribute("aria-disabled"), "true");
  assert.ok(opt(container, "09:30").hasAttribute("data-unavailable"));
  const custom = render(
    h(
      TimePanel,
      {
        ...base,
        id: "c",
        layout: "list",
        slotDuration: 30,
        slots: [{ start: "09:00", data: { who: "Ann" } }],
      } as never,
      h(TimePanelList, null, undefined),
    ),
  );
  assert.ok(custom.container.querySelector('[role="listbox"]'));
  const withContent = render(
    h(
      TimePanel,
      {
        ...base,
        id: "d",
        layout: "list",
        slotDuration: 30,
        slots: [{ start: "09:00", data: { who: "Ann" } }],
      } as never,
      h(TimePanelList, {
        children: (groups: { options: { key: string }[] }[]) =>
          groups
            .flatMap((g) => g.options)
            .map((option) =>
              h(
                TimePanelOption as never,
                { key: option.key, option: option as never },
                ((_o: unknown, slot: { data?: { who: string } } | undefined) =>
                  slot?.data?.who) as never,
              ),
            ),
      } as never),
    ),
  );
  assert.equal(
    withContent.container.querySelector('[role="option"]')?.textContent,
    "Ann",
  );
});

test("range list panel: preview on hover, blocked, commit", () => {
  const commits: string[] = [];
  const { container } = render(
    h(TimeRangePanel, {
      ...base,
      start: "09:00",
      end: "13:00",
      slotDuration: 30,
      maxDuration: 150,
      onValueCommit: (r: {
        start: { hour: number };
        end: { hour: number; minute: number };
      }) => commits.push(`${r.start.hour}-${r.end.hour}:${r.end.minute}`),
    } as never),
  );
  assert.equal(
    container
      .querySelector('[role="listbox"]')
      ?.getAttribute("aria-multiselectable"),
    "true",
  );
  fireEvent.click(opt(container, "10:00"));
  assert.ok(opt(container, "12:30").hasAttribute("data-range-blocked"));
  fireEvent.mouseEnter(opt(container, "11:00"));
  assert.ok(opt(container, "10:30").hasAttribute("data-range-preview"));
  fireEvent.click(opt(container, "12:00"));
  assert.deepEqual(commits, ["10-12:30"]);
  assert.ok(opt(container, "10:30").hasAttribute("data-in-range"));
});

test("range columns panel: two groups with the same columns, blocked end options", () => {
  const { container } = render(
    h(TimeRangePanel, {
      ...base,
      layout: "columns",
      hourCycle: "h23",
      minDuration: 60,
    } as never),
  );
  const groups = container.querySelectorAll('[role="group"][data-chrono-set]');
  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.getAttribute("aria-label"), "Start time");
  fireEvent.click(opt(container, "start:hour:9"));
  fireEvent.click(opt(container, "start:minute:0"));
  assert.ok(opt(container, "end:hour:9").hasAttribute("data-range-blocked"));
  assert.ok(!opt(container, "end:hour:10").hasAttribute("data-range-blocked"));
});

test("Escape bubbles unless it cancels a draft", () => {
  let seen = 0;
  const { container } = render(
    h(
      "div",
      {
        onKeyDown: () => {
          seen += 1;
        },
      },
      h(TimeRangePanel, {
        ...base,
        start: "09:00",
        end: "12:00",
        slotDuration: 30,
      } as never),
    ),
  );
  opt(container, "09:00").focus();
  fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
  assert.equal(seen, 1);
  fireEvent.click(opt(container, "09:00"));
  fireEvent.keyDown(document.activeElement ?? opt(container, "09:00"), {
    key: "Escape",
  });
  assert.equal(seen, 1);
});

test("scrollIntoView is called on keyboard moves and value changes, never throws without it", () => {
  const calls: Element[] = [];
  const proto = window.HTMLElement.prototype as unknown as {
    scrollIntoView?: (this: Element) => void;
  };
  const original = proto.scrollIntoView;
  proto.scrollIntoView = function (this: Element) {
    calls.push(this);
  };
  try {
    const { container } = render(
      h(TimePanel, { ...base, hourCycle: "h23" } as never),
    );
    opt(container, "hour:0").focus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    assert.ok(calls.includes(opt(container, "hour:1")));
    const before = calls.length;
    fireEvent.click(opt(container, "hour:5"));
    assert.ok(calls.length > before);
  } finally {
    proto.scrollIntoView = original;
  }
  cleanup();
  proto.scrollIntoView = undefined;
  const { container } = render(h(TimePanel, { ...base, id: "x" } as never));
  fireEvent.click(opt(container, "hour:5"));
  proto.scrollIntoView = original;
});

test("autoFocus is opt-in; no styles; controlled value follows", () => {
  const off = render(h(TimePanel, base as never));
  assert.notEqual(document.activeElement, opt(off.container, "hour:12"));
  cleanup();
  const on = render(h(TimePanel, { ...base, autoFocus: true } as never));
  assert.equal(
    (document.activeElement as HTMLElement | null)?.getAttribute("role"),
    "option",
  );
  assert.equal(on.container.querySelectorAll("[style], [class]").length, 0);
  cleanup();
  function Both() {
    const [value, setValue] = useState<unknown>(null);
    const props = { ...base, value, onValueChange: setValue } as object;
    return h(
      "div",
      null,
      h(TimeInput, { ...props, id: "i" } as never),
      h(TimePanel, { ...props, id: "p" } as never),
    );
  }
  const { container } = render(h(Both));
  segments(container)[0]?.focus();
  press("0930p");
  assert.equal(opt(container, "hour:9").getAttribute("aria-selected"), "true");
  assert.equal(
    opt(container, "dayPeriod:1").getAttribute("aria-selected"),
    "true",
  );
  fireEvent.click(opt(container, "minute:45"));
  assert.equal(segments(container)[1]?.textContent, "45");
});

test("input: segments, typing, clear, form value and reset", () => {
  const changes: number[] = [];
  const { container } = render(
    h(
      "form",
      null,
      h(
        TimeInput,
        {
          ...base,
          name: "opens",
          defaultValue: plainTime(8, 0),
          onValueChange: (v: { hour: number } | null) =>
            changes.push(v?.hour ?? -1),
        } as never,
        h(TimeInputClearButton),
      ),
    ),
  );
  const form = container.querySelector("form") as HTMLFormElement;
  const hidden = () =>
    form.querySelector("input[type=hidden]") as HTMLInputElement;
  assert.equal(hidden().value, "08:00");
  fireEvent.click(container.querySelector("button") as Element);
  assert.equal(hidden().value, "");
  fireEvent.reset(form);
  assert.equal(hidden().value, "08:00");
  const fresh = render(h(TimeInput, { ...base, id: "f" } as never));
  assert.deepEqual(
    segments(fresh.container).map((s) => s.textContent),
    ["hh", "mm", "--"],
  );
  segments(fresh.container)[0]?.focus();
  press("0930p");
  assert.deepEqual(
    segments(fresh.container).map((s) => s.textContent),
    ["09", "30", "PM"],
  );
});

test("input: text mode and range input with overnight", () => {
  const { container } = render(
    h(TimeInput, { ...base, mode: "text" } as never),
  );
  const input = container.querySelector("input[type=text]") as HTMLInputElement;
  assert.equal(input.getAttribute("placeholder"), "hh:mm --");
  fireEvent.change(input, { target: { value: "9.30 pm" } });
  fireEvent.blur(input);
  assert.equal(input.value.replace(/\s/g, " "), "9:30 PM");
  const range = render(
    h(TimeRangeInput, {
      ...base,
      id: "r",
      name: "shift",
      allowOvernight: true,
      hourCycle: "h23",
      defaultValue: { start: plainTime(23, 0), end: plainTime(2, 0) },
    } as never),
  );
  assert.equal(
    range.container.querySelectorAll("[data-chrono-time-input]").length,
    2,
  );
  assert.equal(
    range.container.firstElementChild?.hasAttribute("data-invalid"),
    false,
  );
  assert.deepEqual(
    [...range.container.querySelectorAll("input[type=hidden]")].map(
      (i) => (i as HTMLInputElement).value,
    ),
    ["23:00", "02:00"],
  );
});

test("parts throw outside a panel", () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.throws(
      () => render(h(TimePanelColumn, { column: {} } as never)),
      /must be used inside/,
    );
  } finally {
    console.error = original;
  }
});
