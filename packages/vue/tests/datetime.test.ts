import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import {
  plainDate,
  plainDateTime,
  plainTime,
} from "@zealakit/chrono-core/foundation";
import { h, nextTick } from "vue";
import { DatePanel, DatePanelGrid } from "../dist/date/index.js";
import {
  DateTimeInput,
  DateTimeInputClearButton,
  DateTimeInputTimeZone,
  DateTimePanel,
  DateTimePanelDate,
  DateTimeRangeInput,
  DateTimeRangePanel,
} from "../dist/datetime/index.js";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = { id: "dt", locale: "en-US", now: Date.UTC(2026, 10, 17, 9, 10) };
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});
const mountIt = (component: object, props: object = {}, slots?: object) => {
  const wrapper = mount(
    component as never,
    {
      props: { ...base, ...props } as never,
      slots: slots as never,
      attachTo: document.body,
    } as never,
  ) as VueWrapper;
  mounted.push(wrapper);
  return wrapper.element as Element;
};
const tick = async () => {
  await nextTick();
  await nextTick();
};
const key = (root: Element, k: string) =>
  root.querySelector(`[data-chrono-key="${k}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const type = async (text: string) => {
  for (const k of text) {
    press(document.activeElement as Element, k);
    await tick();
  }
};

test("input: one segment group, focus crosses the date/time boundary", async () => {
  const changes: string[] = [];
  const root = mountIt(DateTimeInput, {
    hourCycle: "h23",
    "onUpdate:value": (v: { hour: number; minute: number } | null) =>
      changes.push(v ? `${v.hour}:${v.minute}` : "null"),
  });
  assert.deepEqual(
    segments(root).map((s) => s.getAttribute("data-chrono-part")),
    ["month", "day", "year", "hour", "minute"],
  );
  assert.equal(
    segments(root).filter((s) => s.getAttribute("tabindex") === "0").length,
    1,
  );
  segments(root)[0]?.focus();
  await type("11172026");
  assert.equal(document.activeElement, segments(root)[3]);
  await type("0930");
  assert.equal(changes.at(-1), "9:30");
});

test("input: zone label, adjusted marker and hidden offset value", async () => {
  const labelled = mountIt(
    DateTimeInput,
    { id: "l", timeZone: "America/New_York" },
    { default: () => h(DateTimeInputTimeZone) },
  );
  assert.equal(
    labelled.querySelector("span")?.getAttribute("aria-hidden"),
    null,
  );
  assert.ok(labelled.textContent?.length);
  const root = mountIt(DateTimeInput, {
    id: "z",
    hourCycle: "h23",
    timeZone: "America/New_York",
    name: "at",
  });
  segments(root)[0]?.focus();
  await type("030820260230");
  assert.ok(root.hasAttribute("data-adjusted"));
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "2026-03-08T03:30-04:00",
  );
});

test("input: text mode paste fills both fields; clear button; range input", async () => {
  const root = mountIt(DateTimeInput, { mode: "text", hourCycle: "h23" });
  const fields = [
    ...root.querySelectorAll("input[type=text]"),
  ] as HTMLInputElement[];
  assert.deepEqual(
    fields.map((f) => f.getAttribute("aria-label")),
    ["Date", "Time"],
  );
  const paste = new window.Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as Event & { clipboardData?: unknown };
  paste.clipboardData = { getData: () => "12/25/2026 6:15 PM" };
  fields[0]?.dispatchEvent(paste);
  await tick();
  assert.equal(fields[1]?.value.replace(/\s/g, " "), "18:15");
  const clear = mountIt(
    DateTimeInput,
    {
      id: "c",
      defaultValue: plainDateTime(plainDate(2026, 5, 1), plainTime(8, 0)),
    },
    { default: () => h(DateTimeInputClearButton) },
  );
  click(clear.querySelector("button") as Element);
  await tick();
  assert.equal(clear.querySelectorAll("[data-chrono-part]").length, 0);
  const range = mountIt(DateTimeRangeInput, {
    id: "r",
    hourCycle: "h23",
    timeZone: "UTC",
    name: "stay",
  });
  assert.equal(
    range.querySelectorAll("[data-chrono-datetime-input]").length,
    2,
  );
  assert.deepEqual(
    [...range.querySelectorAll("input[type=hidden]")].map(
      (i) => (i as HTMLInputElement).name,
    ),
    ["stay-start", "stay-end"],
  );
});

test("panel: Date parts inside the container render like the standalone panel", () => {
  const composed = mountIt(
    DateTimePanel,
    { id: "p", date: { weekStartsOn: 1 } },
    { default: () => h(DateTimePanelDate, null, () => h(DatePanelGrid)) },
  );
  const grid = (
    composed.querySelector("table") as HTMLElement
  ).outerHTML.replace(/p-date|dt/g, "x");
  const alone = mountIt(
    DatePanel,
    { id: "p-date", weekStartsOn: 1 },
    { default: () => h(DatePanelGrid) },
  );
  assert.equal(
    grid,
    (alone.querySelector("table") as HTMLElement).outerHTML.replace(
      /p-date|dt/g,
      "x",
    ),
  );
});

test("panel: pick a day then a time; commit only from the time part; disablePast", async () => {
  const changes: string[] = [];
  const commits: string[] = [];
  const root = mountIt(DateTimePanel, {
    timeZone: "UTC",
    time: { hourCycle: "h23" },
    disablePast: true,
    "onUpdate:value": (
      v: { day: number; hour: number; minute: number } | null,
    ) => changes.push(v ? `${v.day} ${v.hour}:${v.minute}` : "null"),
    onValueCommit: (v: { day: number; hour: number; minute: number }) =>
      commits.push(`${v.day} ${v.hour}:${v.minute}`),
  });
  assert.equal(key(root, "2026-11-16").getAttribute("aria-disabled"), "true");
  click(key(root, "2026-11-20"));
  await tick();
  assert.deepEqual(changes, []);
  click(key(root, "hour:9"));
  await tick();
  click(key(root, "minute:30"));
  await tick();
  assert.deepEqual(changes, ["20 9:30"]);
  assert.deepEqual(commits, ["20 9:30"]);
  click(key(root, "2026-11-17"));
  await tick();
  assert.equal(key(root, "hour:8").getAttribute("aria-disabled"), "true");
});

test("range panel: commit on the end time", async () => {
  const commits: string[] = [];
  const root = mountIt(DateTimeRangePanel, {
    timeZone: "UTC",
    minDuration: 60,
    date: { months: 1 },
    startTime: { hourCycle: "h23" },
    endTime: { hourCycle: "h23" },
    onValueCommit: (v: {
      start: { hour: number };
      end: { hour: number; minute: number };
    }) => commits.push(`${v.start.hour}-${v.end.hour}:${v.end.minute}`),
  });
  const panels = root.querySelectorAll("[data-chrono-time-panel]");
  assert.equal(panels.length, 2);
  click(key(root, "2026-11-20"));
  await tick();
  click(key(root, "2026-11-20"));
  await tick();
  click(key(panels[0] as Element, "hour:14"));
  await tick();
  click(key(panels[0] as Element, "minute:0"));
  await tick();
  assert.equal(
    key(panels[1] as Element, "hour:13").getAttribute("aria-disabled"),
    "true",
  );
  click(key(panels[1] as Element, "hour:15"));
  await tick();
  click(key(panels[1] as Element, "minute:30"));
  await tick();
  assert.deepEqual(commits, ["14-15:30"]);
  assert.equal(root.querySelectorAll("[style], [class]").length, 0);
});
