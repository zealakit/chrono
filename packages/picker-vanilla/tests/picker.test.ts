import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  type VanillaPicker,
  createDatePicker,
  createDateRangePicker,
  createTimePicker,
  initPickers,
} from "../dist/index.js";
import { resetDom } from "./support/dom.ts";

const NOW = Date.UTC(2026, 10, 17, 12);
const wait = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const live: VanillaPicker[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const p of live.splice(0)) p.destroy();
});

const markup = (kind: string, field: string, panel: string, attrs = "") => `
<div data-chrono-picker="${kind}" id="host" ${attrs}>
  <div id="field" ${field} data-locale="en-US" data-time-zone="UTC" data-now="${NOW}"></div>
  <button data-trigger type="button">Open</button>
  <div data-content hidden><div ${panel} data-locale="en-US" data-time-zone="UTC" data-now="${NOW}"></div></div>
</div>`;
const mountHost = (html: string): HTMLElement => {
  document.body.innerHTML = html;
  return document.getElementById("host") as HTMLElement;
};
const trigger = () => document.querySelector("[data-trigger]") as HTMLElement;
const content = () => document.querySelector("[data-content]") as HTMLElement;
const isOpen = () =>
  !content().hasAttribute("hidden") &&
  content().getAttribute("data-state") !== "closed";
const day = (key: string) =>
  document.body.querySelector(
    `[data-chrono-key="${key}"]:not([data-outside-month])`,
  ) as HTMLElement;
const click = (el: Element) =>
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const pointer = (el: Element) =>
  el.dispatchEvent(
    new (window as never as { PointerEvent: typeof PointerEvent }).PointerEvent(
      "pointerdown",
      { bubbles: true, button: 0, isPrimary: true, pointerType: "mouse" },
    ),
  );
const key = (el: Element, init: KeyboardEventInit) =>
  el.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
const date = (options = {}) => {
  const picker = createDatePicker(
    mountHost(
      markup("date", "data-chrono-date-input", "data-chrono-date-panel"),
    ),
    options,
  );
  live.push(picker);
  return picker;
};

test("the trigger opens a labelled dialog and sets the ARIA contract", async () => {
  date();
  assert.equal(isOpen(), false);
  click(trigger());
  await wait();
  assert.equal(isOpen(), true);
  assert.equal(content().getAttribute("role"), "dialog");
  assert.equal(content().getAttribute("aria-label"), "Choose date");
  assert.equal(trigger().getAttribute("aria-haspopup"), "dialog");
  assert.equal(trigger().getAttribute("aria-expanded"), "true");
});

test("Alt+ArrowDown on the field opens it, plain keys do not", async () => {
  date();
  const field = document.getElementById("field") as HTMLElement;
  key(field, { key: "ArrowDown" });
  await wait();
  assert.equal(isOpen(), false);
  key(field, { key: "ArrowDown", altKey: true });
  await wait();
  assert.equal(isOpen(), true);
});

test("picking a day commits, closes and returns focus to the trigger", async () => {
  const commits: unknown[] = [];
  const reasons: string[] = [];
  date({
    onValueCommit: (e: CustomEvent) => commits.push(e.detail.value),
    onOpenChange: (_o: boolean, r: string) => reasons.push(r),
  });
  click(trigger());
  await wait();
  click(day("2026-11-20"));
  await wait();
  assert.equal(isOpen(), false);
  assert.deepEqual(commits, ["2026-11-20"]);
  assert.deepEqual(reasons, ["trigger", "commit"]);
  assert.equal(document.activeElement, trigger());
});

test("a press on a field segment keeps it open; a press outside closes", async () => {
  date();
  click(trigger());
  await wait();
  pointer(document.querySelector("#field [data-chrono-part]") as Element);
  await wait();
  assert.equal(isOpen(), true, "still open");
  pointer(document.body);
  await wait();
  assert.equal(isOpen(), false);
});

test("Escape closes the popup and reports the reason", async () => {
  const reasons: string[] = [];
  date({ onOpenChange: (_o: boolean, r: string) => reasons.push(r) });
  click(trigger());
  await wait();
  key(content(), { key: "Escape" });
  await wait();
  assert.equal(isOpen(), false);
  assert.deepEqual(reasons, ["trigger", "escape"]);
});

test("a range stays open after the first pick, Escape cancels the draft, the second pick closes", async () => {
  const picker = createDateRangePicker(
    mountHost(
      markup(
        "date-range",
        "data-chrono-date-range-input",
        "data-chrono-date-range-panel",
      ),
    ),
  );
  live.push(picker);
  click(trigger());
  await wait();
  click(day("2026-11-10"));
  await wait();
  assert.equal(isOpen(), true);
  key(day("2026-11-10"), { key: "Escape" });
  await wait();
  assert.equal(isOpen(), true, "Escape cancels the draft only");
  click(day("2026-11-10"));
  await wait();
  click(day("2026-11-14"));
  await wait();
  assert.equal(isOpen(), false);
});

test("time pickers get their own label, and initPickers reads the markup", async () => {
  const picker = createTimePicker(
    mountHost(
      markup("time", "data-chrono-time-input", "data-chrono-time-panel"),
    ),
  );
  assert.equal(content().getAttribute("aria-label"), "Choose time");
  picker.destroy();
  document.body.innerHTML = markup(
    "date",
    "data-chrono-date-input",
    "data-chrono-date-panel",
    'data-placement="bottom-end" data-offset="4"',
  );
  const stop = initPickers();
  click(trigger());
  await wait();
  assert.equal(isOpen(), true);
  stop();
});
