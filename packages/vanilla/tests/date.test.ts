import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { initDateElements } from "../dist/date/index.js";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = `data-locale="en-US" data-time-zone="UTC" data-now="${Date.UTC(2026, 10, 17, 12)}" data-week-starts-on="1"`;
let stop: (() => void) | undefined;

const mount = (html: string): HTMLElement => {
  document.body.innerHTML = html;
  stop = initDateElements(document);
  return document.body;
};
beforeEach(resetDom);
afterEach(() => {
  stop?.();
  stop = undefined;
});

const cell = (root: Element, key: string) =>
  root.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const title = (root: Element) => root.querySelector("h2")?.textContent;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const type = (text: string) => {
  for (const ch of text) press(document.activeElement as Element, ch);
};

test("panel: renders a grid with roving tabindex and selection from data-value", () => {
  const root = mount(
    `<div data-chrono-date-panel data-value="2026-11-20" ${base}></div>`,
  );
  assert.equal(title(root), "November 2026");
  const stops = root.querySelectorAll('[data-chrono-key][tabindex="0"]');
  assert.equal(stops.length, 1);
  assert.equal(stops[0]?.getAttribute("data-chrono-key"), "2026-11-20");
  assert.equal(cell(root, "2026-11-20").getAttribute("aria-selected"), "true");
  assert.equal(root.querySelectorAll("[style], [class]").length, 0);
});

test("panel: click picks and dispatches change and commit events", () => {
  const root = mount(`<div id="p" data-chrono-date-panel ${base}></div>`);
  const seen: string[] = [];
  root.addEventListener("chrono:valuechange", (e) =>
    seen.push(`change:${(e as CustomEvent).detail.value}`),
  );
  root.addEventListener("chrono:valuecommit", (e) =>
    seen.push(`commit:${(e as CustomEvent).detail.value}`),
  );
  click(cell(root, "2026-11-12"));
  assert.deepEqual(seen, ["change:2026-11-12", "commit:2026-11-12"]);
  assert.equal(cell(root, "2026-11-12").getAttribute("aria-selected"), "true");
});

test("panel: keyboard moves focus, paging and levels", () => {
  const root = mount(`<div data-chrono-date-panel ${base}></div>`);
  cell(root, "2026-11-17").focus();
  press(document.activeElement as Element, "ArrowRight");
  assert.equal(document.activeElement, cell(root, "2026-11-18"));
  press(document.activeElement as Element, "PageDown");
  assert.equal(title(root), "December 2026");
  click(root.querySelector('[data-chrono-action="next"]') as Element);
  assert.equal(title(root), "January 2027");
  press(document.activeElement ?? cell(root, "2027-01-18"), "ArrowUp", {
    ctrlKey: true,
  });
});

test("range panel: two months, preview, blocked, commit", () => {
  const root = mount(
    `<div data-chrono-date-range-panel data-max-days="5" ${base}></div>`,
  );
  assert.equal(root.querySelectorAll("table").length, 2);
  const commits: unknown[] = [];
  root.addEventListener("chrono:valuecommit", (e) =>
    commits.push((e as CustomEvent).detail.value),
  );
  click(cell(root, "2026-11-10"));
  assert.equal(
    cell(root, "2026-11-20").hasAttribute("data-range-blocked"),
    true,
  );
  cell(root, "2026-11-12").dispatchEvent(
    new window.MouseEvent("mouseover", { bubbles: true }),
  );
  assert.equal(
    cell(root, "2026-11-11").hasAttribute("data-range-preview"),
    true,
  );
  click(cell(root, "2026-11-12"));
  assert.deepEqual(commits, [{ start: "2026-11-10", end: "2026-11-12" }]);
});

test("Escape bubbles unless it cancels a draft", () => {
  document.body.innerHTML = `<div id="wrap"><div data-chrono-date-range-panel ${base}></div></div>`;
  stop = initDateElements(document);
  let seen = 0;
  document.getElementById("wrap")?.addEventListener("keydown", () => {
    seen += 1;
  });
  cell(document.body, "2026-11-10").focus();
  press(document.activeElement as Element, "Escape");
  assert.equal(seen, 1);
  click(cell(document.body, "2026-11-10"));
  press(cell(document.body, "2026-11-10"), "Escape");
  assert.equal(seen, 1);
});

test("multi panel: shift-click adds a span", () => {
  const root = mount(
    `<div data-chrono-multi-date-panel data-max-selected="4" ${base}></div>`,
  );
  click(cell(root, "2026-11-03"));
  cell(root, "2026-11-05").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, shiftKey: true }),
  );
  assert.equal(root.querySelectorAll('[aria-selected="true"]').length, 3);
});

test("autoFocus is opt-in", () => {
  const off = mount(`<div data-chrono-date-panel ${base}></div>`);
  assert.notEqual(document.activeElement, cell(off, "2026-11-17"));
  stop?.();
  resetDom();
  const on = mount(
    `<div data-chrono-date-panel data-auto-focus ${base}></div>`,
  );
  assert.equal(document.activeElement, cell(on, "2026-11-17"));
});

test("input: typing advances focus even though the markup is re-rendered", () => {
  const root = mount(`<div data-chrono-date-input ${base}></div>`);
  assert.deepEqual(
    segments(root).map((p) => p.textContent),
    ["mm", "dd", "yyyy"],
  );
  const changes: unknown[] = [];
  root.addEventListener("chrono:valuechange", (e) =>
    changes.push((e as CustomEvent).detail.value),
  );
  segments(root)[0]?.focus();
  type("11");
  assert.equal(document.activeElement, segments(root)[1]);
  type("172026");
  assert.deepEqual(changes, ["2026-11-17"]);
  assert.deepEqual(
    segments(root).map((p) => p.textContent),
    ["11", "17", "2026"],
  );
  assert.equal(
    segments(root).filter((p) => p.getAttribute("tabindex") === "0").length,
    1,
  );
});

test("input: text mode parses on blur and keeps invalid text", () => {
  const root = mount(
    `<div data-chrono-date-input data-mode="text" ${base}></div>`,
  );
  const field = () =>
    root.querySelector("input[type=text]") as HTMLInputElement;
  field().value = "Nov 17 2026";
  field().dispatchEvent(new window.Event("input", { bubbles: true }));
  field().dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));
  assert.equal(field().value, "11/17/2026");
  field().value = "garbage";
  field().dispatchEvent(new window.Event("input", { bubbles: true }));
  field().dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));
  assert.equal(field().getAttribute("aria-invalid"), "true");
  assert.equal(field().value, "garbage");
});

test("input: hidden form value and form reset", () => {
  const root = mount(
    `<form><div data-chrono-date-input data-name="when" data-default-value="2026-05-01" ${base}></div></form>`,
  );
  const hidden = () =>
    root.querySelector("input[type=hidden]") as HTMLInputElement;
  assert.equal(hidden().name, "when");
  assert.equal(hidden().value, "2026-05-01");
  segments(root)[0]?.focus();
  press(document.activeElement as Element, "End");
  assert.equal(hidden().value, "2026-12-01");
  root.querySelector("form")?.dispatchEvent(new window.Event("reset"));
  assert.equal(hidden().value, "2026-05-01");
});

test("range input: two groups and names", () => {
  const root = mount(
    `<div data-chrono-date-range-input data-name="stay" data-default-value="2026-06-01/2026-06-09" ${base}></div>`,
  );
  assert.equal(root.querySelectorAll("[data-chrono-date-input]").length, 2);
  assert.deepEqual(
    [...root.querySelectorAll("input[type=hidden]")].map(
      (i) => `${(i as HTMLInputElement).name}=${(i as HTMLInputElement).value}`,
    ),
    ["stay-start=2026-06-01", "stay-end=2026-06-09"],
  );
});

test("data-chrono-for links a panel to an input", () => {
  const root = mount(`
    <div id="in" data-chrono-date-input ${base}></div>
    <div data-chrono-date-panel data-chrono-for="in" ${base}></div>`);
  segments(root)[0]?.focus();
  type("03092027");
  assert.equal(title(root), "March 2027");
  click(cell(root, "2027-03-15"));
  assert.deepEqual(
    segments(root).map((p) => p.textContent),
    ["03", "15", "2027"],
  );
});

test("commit fires when focus leaves the group", () => {
  document.body.innerHTML = `<div data-chrono-date-input ${base}></div><button id="next">next</button>`;
  stop = initDateElements(document);
  const commits: unknown[] = [];
  document.body.addEventListener("chrono:valuecommit", (e) =>
    commits.push((e as CustomEvent).detail.value),
  );
  segments(document.body)[0]?.focus();
  type("11172026");
  (document.getElementById("next") as HTMLElement).focus();
  assert.deepEqual(commits, ["2026-11-17"]);
});

test("cleanup stops the listeners", () => {
  const root = mount(`<div data-chrono-date-panel ${base}></div>`);
  stop?.();
  stop = undefined;
  const before = root.innerHTML;
  click(cell(root, "2026-11-12"));
  assert.equal(root.innerHTML, before);
});
