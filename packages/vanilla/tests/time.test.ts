import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { initTimeElements } from "../dist/time/index.js";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = `data-locale="en-US" data-time-zone="UTC" data-now="${Date.UTC(2026, 10, 17, 9, 10)}"`;
let stop: (() => void) | undefined;
const mount = (html: string): HTMLElement => {
  document.body.innerHTML = html;
  stop = initTimeElements(document);
  return document.body;
};
beforeEach(resetDom);
afterEach(() => {
  stop?.();
  stop = undefined;
});

const opt = (root: Element, key: string) =>
  root.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const type = (text: string) => {
  for (const ch of text) press(document.activeElement as Element, ch);
};

test("columns panel: listboxes, one tab stop, events, commit on the last column", () => {
  const root = mount(`<div data-chrono-time-panel ${base}></div>`);
  assert.equal(root.querySelectorAll('[role="listbox"]').length, 3);
  assert.equal(
    root.querySelectorAll('[role="option"][tabindex="0"]').length,
    1,
  );
  const seen: string[] = [];
  root.addEventListener("chrono:valuechange", (e) =>
    seen.push(`change:${(e as CustomEvent).detail.value}`),
  );
  root.addEventListener("chrono:valuecommit", (e) =>
    seen.push(`commit:${(e as CustomEvent).detail.value}`),
  );
  click(opt(root, "hour:9"));
  click(opt(root, "minute:30"));
  assert.deepEqual(seen, []);
  click(opt(root, "dayPeriod:1"));
  assert.deepEqual(seen, ["change:21:30", "commit:21:30"]);
  assert.equal(opt(root, "hour:9").getAttribute("aria-selected"), "true");
  assert.equal(root.querySelectorAll("[style], [class]").length, 0);
});

test("columns panel: keyboard focus survives the re-render", () => {
  const root = mount(
    `<div data-chrono-time-panel data-hour-cycle="h23" ${base}></div>`,
  );
  opt(root, "hour:0").focus();
  press(document.activeElement as Element, "ArrowDown");
  assert.equal(document.activeElement, opt(root, "hour:1"));
  press(document.activeElement as Element, "ArrowRight");
  assert.equal(document.activeElement, opt(root, "minute:1"));
});

test("list panel with groups and a range list panel", () => {
  const root = mount(
    `<div data-chrono-time-panel data-layout="list" data-start="09:00" data-end="12:00" data-slot-duration="30" data-group-by="hour" ${base}></div>`,
  );
  assert.equal(
    root.querySelectorAll('[role="group"] [role="option"]').length,
    6,
  );
  stop?.();
  resetDom();
  const range = mount(
    `<div data-chrono-time-panel="range" data-start="09:00" data-end="13:00" data-slot-duration="30" data-max-duration="150" ${base}></div>`,
  );
  const commits: unknown[] = [];
  range.addEventListener("chrono:valuecommit", (e) =>
    commits.push((e as CustomEvent).detail.value),
  );
  click(opt(range, "10:00"));
  assert.ok(opt(range, "12:30").hasAttribute("data-range-blocked"));
  opt(range, "11:00").dispatchEvent(
    new window.MouseEvent("mouseover", { bubbles: true }),
  );
  assert.ok(opt(range, "10:30").hasAttribute("data-range-preview"));
  click(opt(range, "12:00"));
  assert.deepEqual(commits, [{ start: "10:00", end: "12:30" }]);
});

test("range columns panel and Escape", () => {
  const root = mount(
    `<div data-chrono-time-panel="range" data-layout="columns" data-hour-cycle="h23" data-min-duration="60" ${base}></div>`,
  );
  assert.equal(
    root.querySelectorAll('[role="group"][data-chrono-set]').length,
    2,
  );
  click(opt(root, "start:hour:9"));
  click(opt(root, "start:minute:0"));
  assert.ok(opt(root, "end:hour:9").hasAttribute("data-range-blocked"));
  stop?.();
  document.body.innerHTML = `<div id="wrap"><div data-chrono-time-panel="range" data-start="09:00" data-end="12:00" data-slot-duration="30" ${base}></div></div>`;
  stop = initTimeElements(document);
  let seen = 0;
  document.getElementById("wrap")?.addEventListener("keydown", () => {
    seen += 1;
  });
  opt(document.body, "09:00").focus();
  press(document.activeElement as Element, "Escape");
  assert.equal(seen, 1);
  click(opt(document.body, "09:00"));
  press(opt(document.body, "09:00"), "Escape");
  assert.equal(seen, 1);
});

test("scrollIntoView on keyboard moves; autoFocus opt-in", () => {
  const calls: Element[] = [];
  const proto = window.HTMLElement.prototype as unknown as {
    scrollIntoView?: (this: Element) => void;
  };
  const original = proto.scrollIntoView;
  proto.scrollIntoView = function (this: Element) {
    calls.push(this);
  };
  try {
    const root = mount(
      `<div data-chrono-time-panel data-hour-cycle="h23" ${base}></div>`,
    );
    opt(root, "hour:0").focus();
    press(document.activeElement as Element, "ArrowDown");
    assert.ok(calls.includes(opt(root, "hour:1")));
  } finally {
    proto.scrollIntoView = original;
  }
  stop?.();
  resetDom();
  (document.activeElement as HTMLElement | null)?.blur?.();
  mount(`<div data-chrono-time-panel ${base}></div>`);
  assert.notEqual(document.activeElement?.getAttribute("role"), "option");
  stop?.();
  resetDom();
  mount(`<div data-chrono-time-panel data-auto-focus ${base}></div>`);
  assert.equal(document.activeElement?.getAttribute("role"), "option");
});

test("input: typing keeps focus through re-render, text mode, hidden value and form reset", () => {
  const root = mount(
    `<form><div data-chrono-time-input data-name="opens" data-default-value="08:00" ${base}></div></form>`,
  );
  const hidden = () =>
    root.querySelector("input[type=hidden]") as HTMLInputElement;
  assert.equal(hidden().value, "08:00");
  segments(root)[0]?.focus();
  type("0930p");
  assert.equal(hidden().value, "21:30");
  root.querySelector("form")?.dispatchEvent(new window.Event("reset"));
  assert.equal(hidden().value, "08:00");
  stop?.();
  resetDom();
  const text = mount(
    `<div data-chrono-time-input data-mode="text" ${base}></div>`,
  );
  const field = () =>
    text.querySelector("input[type=text]") as HTMLInputElement;
  field().value = "9.30 pm";
  field().dispatchEvent(new window.Event("input", { bubbles: true }));
  field().dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));
  assert.equal(field().value.replace(/\s/g, " "), "9:30 PM");
});

test("range input, linking and commit on leaving the group", () => {
  const range = mount(
    `<div data-chrono-time-range-input data-name="shift" data-allow-overnight data-hour-cycle="h23" data-default-value="23:00/02:00" ${base}></div>`,
  );
  assert.equal(range.querySelectorAll("[data-chrono-time-input]").length, 2);
  assert.deepEqual(
    [...range.querySelectorAll("input[type=hidden]")].map(
      (i) => (i as HTMLInputElement).value,
    ),
    ["23:00", "02:00"],
  );
  stop?.();
  resetDom();
  const root = mount(
    `<div id="in" data-chrono-time-input ${base}></div><div data-chrono-time-panel data-chrono-for="in" ${base}></div><button id="next" type="button">n</button>`,
  );
  const commits: unknown[] = [];
  root.addEventListener("chrono:valuecommit", (e) =>
    commits.push((e as CustomEvent).detail.value),
  );
  segments(root)[0]?.focus();
  type("0930p");
  assert.equal(opt(root, "hour:9").getAttribute("aria-selected"), "true");
  click(opt(root, "minute:45"));
  assert.equal(segments(root)[1]?.textContent, "45");
  click(opt(root, "dayPeriod:0"));
  assert.deepEqual(commits, ["09:45"]);
  assert.equal(segments(root)[2]?.textContent, "AM");
});

test("cleanup stops the listeners", () => {
  const root = mount(`<div data-chrono-time-panel ${base}></div>`);
  stop?.();
  stop = undefined;
  const before = root.innerHTML;
  click(opt(root, "hour:9"));
  assert.equal(root.innerHTML, before);
});
