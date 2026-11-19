import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  TimePicker,
} from "../dist/index.js";
import { resetDom } from "./support/dom.ts";

const NOW = Date.UTC(2026, 10, 17, 12);
const base = { locale: "en-US", timeZone: "UTC", now: NOW, portal: false };
const wait = async (ms = 30) => {
  await new Promise((r) => setTimeout(r, ms));
  await nextTick();
};
const mounted: VueWrapper[] = [];
beforeEach(resetDom);
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
});

function open(props: Record<string, unknown> = {}, Picker = DatePicker) {
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(Picker.Root as never, { ...base, ...props }, () => [
          h(Picker.Input as never, { "data-testid": "input" }),
          h(
            Picker.Trigger as never,
            { "data-testid": "trigger" },
            () => "Open",
          ),
          h(Picker.Content as never, { "data-testid": "content" }, () =>
            h(Picker.Panel as never),
          ),
        ]),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  return wrapper;
}
const isOpen = () => q("content")?.getAttribute("data-state") === "open";
const q = (id: string) =>
  document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const day = (key: string) =>
  document.body.querySelector(
    `[data-chrono-key="${key}"]:not([data-outside-month])`,
  ) as HTMLElement;
const click = (el: Element) =>
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const press = (el: Element, type: string) =>
  el.dispatchEvent(
    new (window as never as { PointerEvent: typeof PointerEvent }).PointerEvent(
      type,
      { bubbles: true, button: 0 },
    ),
  );

test("the trigger opens a labelled dialog and the ARIA contract is set", async () => {
  open();
  await wait(20);
  assert.equal(isOpen(), false);
  click(q("trigger") as HTMLElement);
  await wait();
  const content = q("content") as HTMLElement;
  assert.equal(content.getAttribute("role"), "dialog");
  assert.equal(content.getAttribute("aria-label"), "Choose date");
  assert.equal(
    (q("trigger") as HTMLElement).getAttribute("aria-haspopup"),
    "dialog",
  );
  assert.equal(
    (q("trigger") as HTMLElement).getAttribute("aria-expanded"),
    "true",
  );
});

test("Alt+ArrowDown on the input opens it, plain keys do not", async () => {
  open();
  await wait(20);
  const input = q("input") as HTMLElement;
  input.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
  );
  await wait();
  assert.equal(isOpen(), false);
  input.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "ArrowDown",
      altKey: true,
      bubbles: true,
    }),
  );
  await wait();
  assert.equal(isOpen(), true);
});

test("picking a day commits, closes and returns focus to the trigger", async () => {
  const commits: unknown[] = [];
  open({ onValueCommit: (v: unknown) => commits.push(v) });
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  click(day("2026-11-20"));
  await wait();
  assert.equal(isOpen(), false);
  assert.equal(commits.length, 1);
  assert.equal(document.activeElement, q("trigger"));
});

test("a press on an input segment keeps it open; a press outside closes", async () => {
  const wrapper = open();
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  press(
    (q("input") as HTMLElement).querySelector("[role=spinbutton]") as Element,
    "pointerdown",
  );
  await wait();
  assert.equal(isOpen(), true, "still open");
  press(document.body, "pointerdown");
  await wait();
  assert.equal(isOpen(), false);
  void wrapper;
});

test("Escape closes, reports reasons, and controlled open waits for the app", async () => {
  const reasons: string[] = [];
  open({ onOpenChange: (_o: boolean, reason: string) => reasons.push(reason) });
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  (q("content") as HTMLElement).dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await wait();
  assert.equal(isOpen(), false);
  assert.deepEqual(reasons, ["trigger", "escape"]);
});

test("a controlled open prop stays closed until the app opens it", async () => {
  const flag = ref(false);
  const opens: boolean[] = [];
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          DatePicker.Root as never,
          {
            ...base,
            open: flag.value,
            "onUpdate:open": (o: boolean) => opens.push(o),
          },
          () => [
            h(DatePicker.Input as never),
            h(
              DatePicker.Trigger as never,
              { "data-testid": "trigger" },
              () => "Open",
            ),
            h(DatePicker.Content as never, { "data-testid": "content" }),
          ],
        ),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  assert.equal(isOpen(), false);
  assert.deepEqual(opens, [true]);
  flag.value = true;
  await wait();
  assert.equal(isOpen(), true);
});

test("a range keeps the popup open after the first pick and closes after the second", async () => {
  open({}, DateRangePicker as never);
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  click(day("2026-11-10"));
  await wait();
  assert.equal(isOpen(), true);
  click(day("2026-11-14"));
  await wait();
  assert.equal(isOpen(), false);
});

test("Escape during a range preview cancels the preview only, then closes", async () => {
  open({}, DateRangePicker as never);
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  click(day("2026-11-10"));
  await wait();
  day("2026-11-10").dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  await wait();
  assert.equal(isOpen(), true, "the draft is cancelled, the popup stays");
  day("2026-11-10").dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  await wait();
  assert.equal(isOpen(), false);
});

test("time and date-time pickers open with their own labels", async () => {
  open({}, TimePicker as never);
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  assert.equal(
    (q("content") as HTMLElement).getAttribute("aria-label"),
    "Choose time",
  );
  mounted.pop()?.unmount();
  resetDom();
  open({}, DateTimePicker as never);
  await wait(20);
  click(q("trigger") as HTMLElement);
  await wait();
  assert.equal(
    (q("content") as HTMLElement).getAttribute("aria-label"),
    "Choose date and time",
  );
});
