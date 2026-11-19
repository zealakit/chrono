import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import {
  plainDate,
  plainDateTime,
  plainTime,
} from "@zealakit/chrono-core/foundation";
import { createElement as h } from "react";
import { DatePanel, DatePanelGrid } from "../dist/date/index.js";
import {
  DateTimeInput,
  DateTimeInputClearButton,
  DateTimeInputTimeZone,
  DateTimePanel,
  DateTimePanelDate,
  DateTimeRangeInput,
  DateTimeRangePanel,
  DateTimeRangePanelEndTime,
  DateTimeRangePanelStartTime,
} from "../dist/datetime/index.js";
import { TimePanel } from "../dist/time/index.js";
import { resetDom } from "./support/dom.ts";

const base = {
  id: "dt",
  locale: "en-US",
  now: Date.UTC(2026, 10, 17, 9, 10),
} as const;
beforeEach(resetDom);
afterEach(cleanup);

const key = (root: Element, k: string) =>
  root.querySelector(`[data-chrono-key="${k}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const press = (text: string) => {
  for (const k of text)
    fireEvent.keyDown(document.activeElement as Element, { key: k });
};

test("input: one segment group, date then time, focus crosses the boundary", () => {
  const changes: string[] = [];
  const { container } = render(
    h(DateTimeInput, {
      ...base,
      hourCycle: "h23",
      onValueChange: (v: { hour: number; minute: number } | null) =>
        changes.push(v ? `${v.hour}:${v.minute}` : "null"),
    } as never),
  );
  assert.deepEqual(
    segments(container).map((s) => s.getAttribute("data-chrono-part")),
    ["month", "day", "year", "hour", "minute"],
  );
  assert.equal(
    segments(container).filter((s) => s.getAttribute("tabindex") === "0")
      .length,
    1,
  );
  segments(container)[0]?.focus();
  press("11172026");
  assert.equal(document.activeElement, segments(container)[3]);
  press("0930");
  assert.equal(changes.at(-1), "9:30");
  assert.equal(container.querySelector("[data-invalid]"), null);
});

test("input: zoned value, time zone label, adjusted marker, hidden offset value", () => {
  const { container } = render(
    h(
      DateTimeInput,
      {
        ...base,
        hourCycle: "h23",
        timeZone: "America/New_York",
        name: "at",
      } as never,
      h(DateTimeInputTimeZone),
    ),
  );
  assert.ok(container.textContent?.length);
  const label = container.querySelector(
    "span:not([data-chrono-part]):not([data-chrono-literal])",
  );
  assert.ok(label && label.getAttribute("aria-hidden") === null);
  const { container: c2 } = render(
    h(DateTimeInput, {
      ...base,
      id: "z",
      hourCycle: "h23",
      timeZone: "America/New_York",
      name: "at",
    } as never),
  );
  segments(c2)[0]?.focus();
  press("030820260230");
  assert.ok(c2.firstElementChild?.hasAttribute("data-adjusted"));
  assert.equal(
    (c2.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "2026-03-08T03:30-04:00",
  );
});

test("input: text mode has two labelled fields; paste fills both", () => {
  const { container } = render(
    h(DateTimeInput, { ...base, mode: "text", hourCycle: "h23" } as never),
  );
  const fields = [
    ...container.querySelectorAll("input[type=text]"),
  ] as HTMLInputElement[];
  assert.equal(fields.length, 2);
  assert.deepEqual(
    fields.map((f) => f.getAttribute("aria-label")),
    ["Date", "Time"],
  );
  fireEvent.paste(fields[0] as Element, {
    clipboardData: { getData: () => "12/25/2026 6:15 PM" },
  });
  assert.equal(fields[0]?.value.replace(/\s/g, " "), "12/25/2026");
  assert.equal(fields[1]?.value.replace(/\s/g, " "), "18:15");
  const withClear = render(
    h(
      DateTimeInput,
      {
        ...base,
        id: "c",
        defaultValue: plainDateTime(plainDate(2026, 5, 1), plainTime(8, 0)),
      } as never,
      h(DateTimeInputClearButton),
    ),
  );
  fireEvent.click(withClear.container.querySelector("button") as Element);
  assert.equal(
    withClear.container.querySelectorAll("[data-chrono-part]").length,
    0,
  );
});

test("range input: two date-time groups, names and validity", () => {
  const { container } = render(
    h(DateTimeRangeInput, {
      ...base,
      hourCycle: "h23",
      timeZone: "UTC",
      name: "stay",
      minDuration: 60,
      defaultValue: {
        start: {
          ...plainDateTime(plainDate(2026, 11, 17), plainTime(14, 0)),
          timeZone: "UTC",
          offset: 0,
        },
        end: {
          ...plainDateTime(plainDate(2026, 11, 18), plainTime(10, 0)),
          timeZone: "UTC",
          offset: 0,
        },
      },
    } as never),
  );
  assert.equal(
    container.querySelectorAll("[data-chrono-datetime-input]").length,
    2,
  );
  assert.deepEqual(
    [...container.querySelectorAll("input[type=hidden]")].map(
      (i) => (i as HTMLInputElement).name,
    ),
    ["stay-start", "stay-end"],
  );
  assert.equal(
    container.firstElementChild?.hasAttribute("data-invalid"),
    false,
  );
});

test("panel: Date and Time parts inside the containers render like the standalone panels", () => {
  const composed = render(
    h(
      DateTimePanel,
      {
        ...base,
        id: "p",
        date: { weekStartsOn: 1 },
        time: { hourCycle: "h23" },
      } as never,
      h(DateTimePanelDate, null, h(DatePanelGrid)),
    ),
  ).container;
  const grid = composed.querySelector("table") as HTMLElement;
  cleanup();
  const standalone = render(
    h(
      DatePanel,
      {
        id: "p-date",
        locale: "en-US",
        now: base.now,
        weekStartsOn: 1,
      } as never,
      h(DatePanelGrid),
    ),
  ).container;
  const alone = standalone.querySelector("table") as HTMLElement;
  assert.equal(
    grid.outerHTML.replace(/p-date|dt/g, "x"),
    alone.outerHTML.replace(/p-date|dt/g, "x"),
  );
});

test("panel: pick a day then a time; commit only from the time part", () => {
  const changes: string[] = [];
  const commits: string[] = [];
  const { container } = render(
    h(DateTimePanel, {
      ...base,
      timeZone: "UTC",
      time: { hourCycle: "h23" },
      onValueChange: (
        v: { day: number; hour: number; minute: number } | null,
      ) => changes.push(v ? `${v.day} ${v.hour}:${v.minute}` : "null"),
      onValueCommit: (v: { day: number; hour: number; minute: number }) =>
        commits.push(`${v.day} ${v.hour}:${v.minute}`),
    } as never),
  );
  fireEvent.click(key(container, "2026-11-20"));
  assert.deepEqual(changes, []);
  fireEvent.click(key(container, "hour:9"));
  fireEvent.click(key(container, "minute:30"));
  assert.deepEqual(changes, ["20 9:30"]);
  assert.deepEqual(commits, ["20 9:30"]);
  fireEvent.click(key(container, "2026-11-22"));
  assert.deepEqual(changes, ["20 9:30", "22 9:30"]);
  assert.deepEqual(commits, ["20 9:30"]);
  assert.equal(
    container.firstElementChild?.hasAttribute("data-chrono-datetime-panel"),
    true,
  );
});

test("panel: disablePast disables earlier days and the earlier times of today", () => {
  const { container } = render(
    h(DateTimePanel, {
      ...base,
      timeZone: "UTC",
      disablePast: true,
      time: { hourCycle: "h23" },
      defaultTime: "12:00",
    } as never),
  );
  assert.equal(
    key(container, "2026-11-16").getAttribute("aria-disabled"),
    "true",
  );
  fireEvent.click(key(container, "2026-11-17"));
  assert.equal(key(container, "hour:8").getAttribute("aria-disabled"), "true");
  assert.equal(key(container, "hour:9").getAttribute("aria-disabled"), null);
});

test("range panel: three containers, commit on the end time, no styles", () => {
  const commits: string[] = [];
  const { container } = render(
    h(DateTimeRangePanel, {
      ...base,
      timeZone: "UTC",
      minDuration: 60,
      date: { months: 1 },
      startTime: { hourCycle: "h23" },
      endTime: { hourCycle: "h23" },
      onValueCommit: (v: {
        start: { hour: number };
        end: { hour: number; minute: number };
      }) => commits.push(`${v.start.hour}-${v.end.hour}:${v.end.minute}`),
    } as never),
  );
  assert.equal(
    container.querySelectorAll("[data-chrono-time-panel]").length,
    2,
  );
  fireEvent.click(key(container, "2026-11-20"));
  fireEvent.click(key(container, "2026-11-20"));
  const start = container.querySelectorAll(
    "[data-chrono-time-panel]",
  )[0] as Element;
  const end = container.querySelectorAll(
    "[data-chrono-time-panel]",
  )[1] as Element;
  fireEvent.click(key(start, "hour:14"));
  fireEvent.click(key(start, "minute:0"));
  assert.equal(key(end, "hour:13").getAttribute("aria-disabled"), "true");
  fireEvent.click(key(end, "hour:15"));
  fireEvent.click(key(end, "minute:30"));
  assert.deepEqual(commits, ["14-15:30"]);
  assert.equal(container.querySelectorAll("[style], [class]").length, 0);
  void DateTimeRangePanelStartTime;
  void DateTimeRangePanelEndTime;
  void TimePanel;
});
