import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { initDateTimeElements } from "../dist/datetime/index.js";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = `data-locale="en-US" data-now="${Date.UTC(2026, 10, 17, 9, 10)}"`;
let stop: (() => void) | undefined;
const mount = (html: string): HTMLElement => {
  document.body.innerHTML = html;
  stop = initDateTimeElements(document);
  return document.body;
};
beforeEach(resetDom);
afterEach(() => {
  stop?.();
  stop = undefined;
});

const key = (root: Element, k: string) =>
  root.querySelector(`[data-chrono-key="${k}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const type = (text: string) => {
  for (const ch of text) press(document.activeElement as Element, ch);
};

test("input: one segment group; focus crosses the date/time boundary and survives re-render", () => {
  const root = mount(
    `<div data-chrono-datetime-input data-hour-cycle="h23" ${base}></div>`,
  );
  const changes: unknown[] = [];
  root.addEventListener("chrono:valuechange", (e) =>
    changes.push((e as CustomEvent).detail.value),
  );
  assert.deepEqual(
    segments(root).map((s) => s.getAttribute("data-chrono-part")),
    ["month", "day", "year", "hour", "minute"],
  );
  assert.equal(
    segments(root).filter((s) => s.getAttribute("tabindex") === "0").length,
    1,
  );
  segments(root)[0]?.focus();
  type("11172026");
  assert.equal(document.activeElement, segments(root)[3]);
  type("0930");
  assert.equal(changes.at(-1), "2026-11-17T09:30:00");
});

test("input: zoned value with a hidden offset value and the adjusted marker", () => {
  const root = mount(
    `<div data-chrono-datetime-input data-hour-cycle="h23" data-time-zone="America/New_York" data-name="at" ${base}></div>`,
  );
  segments(root)[0]?.focus();
  type("030820260230");
  const host = root.firstElementChild as Element;
  assert.ok(host.hasAttribute("data-adjusted"));
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "2026-03-08T03:30-04:00",
  );
});

test("input: text mode with two fields, a paste fills both; form reset", () => {
  const root = mount(
    `<form><div data-chrono-datetime-input data-mode="text" data-hour-cycle="h23" data-name="when" data-default-value="2026-05-01T08:00" ${base}></div></form>`,
  );
  const fields = () =>
    [...root.querySelectorAll("input[type=text]")] as HTMLInputElement[];
  assert.deepEqual(
    fields().map((f) => f.getAttribute("aria-label")),
    ["Date", "Time"],
  );
  const paste = new window.Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as Event & { clipboardData?: unknown };
  paste.clipboardData = { getData: () => "12/25/2026 6:15 PM" };
  fields()[0]?.dispatchEvent(paste);
  assert.equal(fields()[1]?.value.replace(/\s/g, " "), "18:15");
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "2026-12-25T18:15",
  );
  root.querySelector("form")?.dispatchEvent(new window.Event("reset"));
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "2026-05-01T08:00",
  );
});

test("range input: two groups and names", () => {
  const root = mount(
    `<div data-chrono-datetime-range-input data-name="stay" data-time-zone="UTC" data-hour-cycle="h23" ${base}></div>`,
  );
  assert.equal(root.querySelectorAll("[data-chrono-datetime-input]").length, 2);
  assert.deepEqual(
    [...root.querySelectorAll("input[type=hidden]")].map(
      (i) => (i as HTMLInputElement).name,
    ),
    ["stay-start", "stay-end"],
  );
});

test("panel: pick a day then a time; events; commit only from the time part; disablePast", () => {
  const root = mount(
    `<div data-chrono-datetime-panel data-time-zone="UTC" data-hour-cycle="h23" data-disable-past ${base}></div>`,
  );
  const seen: string[] = [];
  root.addEventListener("chrono:valuechange", (e) =>
    seen.push(`change:${(e as CustomEvent).detail.value}`),
  );
  root.addEventListener("chrono:valuecommit", (e) =>
    seen.push(`commit:${(e as CustomEvent).detail.value}`),
  );
  assert.equal(key(root, "2026-11-16").getAttribute("aria-disabled"), "true");
  click(key(root, "2026-11-20"));
  assert.deepEqual(seen, []);
  click(key(root, "hour:9"));
  click(key(root, "minute:30"));
  assert.equal(seen.length, 2);
  assert.match(seen[0] as string, /^change:2026-11-20T09:30:00/);
  assert.match(seen[1] as string, /^commit:2026-11-20T09:30:00/);
  click(key(root, "2026-11-17"));
  assert.equal(key(root, "hour:8").getAttribute("aria-disabled"), "true");
  assert.equal(root.querySelectorAll("[style], [class]").length, 0);
});

test("range panel: commit on the end time", () => {
  const root = mount(
    `<div data-chrono-datetime-panel="range" data-time-zone="UTC" data-hour-cycle="h23" data-min-duration="60" ${base}></div>`,
  );
  const commits: unknown[] = [];
  root.addEventListener("chrono:valuecommit", (e) =>
    commits.push((e as CustomEvent).detail.value),
  );
  const panels = root.querySelectorAll("[data-chrono-time-panel]");
  assert.equal(panels.length, 2);
  click(key(root, "2026-11-20"));
  click(key(root, "2026-11-20"));
  click(key(panels[0] as Element, "hour:14"));
  click(key(panels[0] as Element, "minute:0"));
  assert.equal(
    key(panels[1] as Element, "hour:13").getAttribute("aria-disabled"),
    "true",
  );
  click(key(panels[1] as Element, "hour:15"));
  click(key(panels[1] as Element, "minute:30"));
  assert.equal(commits.length, 1);
  const detail = commits[0] as { start: string; end: string };
  assert.match(detail.start, /^2026-11-20T14:00:00/);
  assert.match(detail.end, /^2026-11-20T15:30:00/);
});

test("linking an input to a panel; cleanup", () => {
  const root = mount(
    `<div id="in" data-chrono-datetime-input data-hour-cycle="h23" ${base}></div><div data-chrono-datetime-panel data-chrono-for="in" data-hour-cycle="h23" ${base}></div>`,
  );
  segments(root)[0]?.focus();
  type("111720260930");
  assert.equal(key(root, "hour:9").getAttribute("aria-selected"), "true");
  click(key(root, "minute:45"));
  assert.equal(segments(root)[4]?.textContent, "45");
  stop?.();
  stop = undefined;
  const before = root.innerHTML;
  click(key(root, "hour:10"));
  assert.equal(root.innerHTML, before);
});
