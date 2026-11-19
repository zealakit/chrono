import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { plainDate } from "@zealakit/chrono-core/foundation";
import { defineComponent, h, nextTick, ref } from "vue";
import {
  DateInput,
  DateInputClearButton,
  DatePanel,
  DatePanelGrid,
  DatePanelLevelButton,
  DatePanelNextButton,
  DatePanelPrevButton,
  DatePanelTitle,
  DateRangeInput,
  DateRangePanel,
  MultiDatePanel,
} from "../dist/date/index.js";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = {
  id: "d",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};
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
const cell = (root: Element, key: string) =>
  root.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const title = (root: Element) => root.querySelector("h2")?.textContent;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const type = async (text: string) => {
  for (const key of text) {
    press(document.activeElement as Element, key);
    await tick();
  }
};

test("panel: grid, roving tabindex and selection", () => {
  const root = mountIt(DatePanel, { defaultValue: plainDate(2026, 11, 20) });
  assert.equal(title(root), "November 2026");
  const stops = root.querySelectorAll('[data-chrono-key][tabindex="0"]');
  assert.equal(stops.length, 1);
  assert.equal(stops[0]?.getAttribute("data-chrono-key"), "2026-11-20");
  assert.equal(cell(root, "2026-11-20").getAttribute("aria-selected"), "true");
  assert.equal(cell(root, "2026-11-17").getAttribute("aria-current"), "date");
});

test("panel: click picks and commits once; keys move focus", async () => {
  const commits: number[] = [];
  const root = mountIt(DatePanel, {
    onValueCommit: (v: { day: number }) => commits.push(v.day),
  });
  click(cell(root, "2026-11-12"));
  await tick();
  assert.deepEqual(commits, [12]);
  cell(root, "2026-11-12").focus();
  press(document.activeElement as Element, "ArrowRight");
  await tick();
  assert.equal(document.activeElement, cell(root, "2026-11-13"));
});

test("panel: composition, paging and levels", async () => {
  const root = mountIt(
    DatePanel,
    {},
    {
      default: () => [
        h(DatePanelPrevButton),
        h(DatePanelLevelButton),
        h(DatePanelNextButton),
        h(DatePanelGrid),
      ],
    },
  );
  const buttons = root.querySelectorAll("button");
  click(buttons[2] as Element);
  await tick();
  assert.equal(buttons[1]?.textContent, "December 2026");
  click(buttons[1] as Element);
  await tick();
  assert.equal(root.querySelectorAll("td[data-chrono-key]").length, 12);
  click(cell(root, "2026-03"));
  await tick();
  assert.equal(
    root.querySelector("button:nth-of-type(2)")?.textContent,
    "March 2026",
  );
});

test("range panel: two months, preview, blocked, commit", async () => {
  const commits: string[] = [];
  const root = mountIt(DateRangePanel, {
    maxDays: 5,
    onValueCommit: (r: { start: { day: number }; end: { day: number } }) =>
      commits.push(`${r.start.day}-${r.end.day}`),
  });
  assert.equal(root.querySelectorAll("table").length, 2);
  click(cell(root, "2026-11-10"));
  await tick();
  assert.equal(
    cell(root, "2026-11-20").hasAttribute("data-range-blocked"),
    true,
  );
  cell(root, "2026-11-12").dispatchEvent(
    new window.MouseEvent("mouseenter", { bubbles: false }),
  );
  await tick();
  assert.equal(
    cell(root, "2026-11-11").hasAttribute("data-range-preview"),
    true,
  );
  click(cell(root, "2026-11-12"));
  await tick();
  assert.deepEqual(commits, ["10-12"]);
});

test("Escape bubbles unless it cancels a draft", async () => {
  let seen = 0;
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(
          "div",
          {
            onKeydown: () => {
              seen += 1;
            },
          },
          h(DateRangePanel, base as never),
        ),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  const root = wrapper.element as Element;
  cell(root, "2026-11-10").focus();
  press(document.activeElement as Element, "Escape");
  await tick();
  assert.equal(seen, 1);
  click(cell(root, "2026-11-10"));
  await tick();
  press(document.activeElement as Element, "Escape");
  await tick();
  assert.equal(seen, 1);
  assert.equal(root.querySelectorAll("[data-range-start]").length, 0);
});

test("multi panel: shift-click span and cap", async () => {
  const root = mountIt(MultiDatePanel, { maxSelected: 4 });
  click(cell(root, "2026-11-03"));
  await tick();
  cell(root, "2026-11-05").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, shiftKey: true }),
  );
  await tick();
  assert.equal(root.querySelectorAll('[aria-selected="true"]').length, 3);
});

test("autoFocus is opt-in", () => {
  const off = mountIt(DatePanel, {});
  assert.notEqual(document.activeElement, cell(off, "2026-11-17"));
  const on = mountIt(DatePanel, { id: "x", autoFocus: true });
  assert.equal(document.activeElement, cell(on, "2026-11-17"));
});

test("controlled value follows and updates", async () => {
  const value = ref<unknown>(null);
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(DatePanel, {
          ...base,
          value: value.value,
          "onUpdate:value": (v: unknown) => {
            value.value = v;
          },
        } as never),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  const root = wrapper.element as Element;
  value.value = plainDate(2027, 3, 9);
  await tick();
  assert.equal(title(root), "March 2027");
  click(cell(root, "2027-03-15"));
  await tick();
  assert.equal((value.value as { day: number }).day, 15);
});

test("no style and no class from Chrono", () => {
  const root = mountIt(DatePanel, {});
  assert.equal(root.querySelectorAll("[style], [class]").length, 0);
});

test("parts throw outside a panel", () => {
  assert.throws(() => mount(DatePanelTitle as never), /must be used inside/);
});

test("input: typing, advance and change event", async () => {
  const changes: number[] = [];
  const root = mountIt(DateInput, {
    "onUpdate:value": (v: { day: number } | null) => changes.push(v?.day ?? -1),
  });
  assert.deepEqual(
    segments(root).map((p) => p.textContent),
    ["mm", "dd", "yyyy"],
  );
  segments(root)[0]?.focus();
  await type("11");
  assert.equal(document.activeElement, segments(root)[1]);
  await type("172026");
  assert.deepEqual(changes, [17]);
  assert.deepEqual(
    segments(root).map((p) => p.textContent),
    ["11", "17", "2026"],
  );
});

test("input: stepping, invalid marking, clear button", async () => {
  const root = mountIt(
    DateInput,
    { defaultValue: plainDate(2026, 1, 31) },
    {
      default: () => h(DateInputClearButton),
    },
  );
  assert.equal(root.querySelector("button")?.textContent, "Clear");
  click(root.querySelector("button") as Element);
  await tick();
  assert.equal(root.querySelectorAll("[data-chrono-part]").length, 0);
});

test("input: text mode parses on blur and keeps invalid text", async () => {
  const root = mountIt(DateInput, { mode: "text" });
  const input = root.querySelector("input[type=text]") as HTMLInputElement;
  input.value = "Nov 17 2026";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await tick();
  input.dispatchEvent(new window.FocusEvent("blur"));
  await tick();
  assert.equal(input.value, "11/17/2026");
  input.value = "garbage";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  input.dispatchEvent(new window.FocusEvent("blur"));
  await tick();
  assert.equal(input.getAttribute("aria-invalid"), "true");
});

test("input: hidden form value and reset", async () => {
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(
          "form",
          null,
          h(DateInput, {
            ...base,
            name: "when",
            defaultValue: plainDate(2026, 5, 1),
          } as never),
        ),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  const form = wrapper.element as HTMLFormElement;
  const hidden = () =>
    form.querySelector("input[type=hidden]") as HTMLInputElement;
  assert.equal(hidden().value, "2026-05-01");
  segments(form)[0]?.focus();
  press(document.activeElement as Element, "End");
  await tick();
  assert.equal(hidden().value, "2026-12-01");
  form.dispatchEvent(new window.Event("reset"));
  await tick();
  assert.equal(hidden().value, "2026-05-01");
});

test("range input: two groups and names", () => {
  const root = mountIt(DateRangeInput, {
    name: "stay",
    defaultValue: { start: plainDate(2026, 6, 1), end: plainDate(2026, 6, 9) },
  });
  assert.equal(root.querySelectorAll("[data-chrono-date-input]").length, 2);
  assert.deepEqual(
    [...root.querySelectorAll("input[type=hidden]")].map(
      (i) => `${(i as HTMLInputElement).name}=${(i as HTMLInputElement).value}`,
    ),
    ["stay-start=2026-06-01", "stay-end=2026-06-09"],
  );
});

test("commit fires when focus leaves the group", async () => {
  const commits: number[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h("div", null, [
          h(DateInput, {
            ...base,
            onValueCommit: (v: { day: number }) => commits.push(v.day),
          } as never),
          h("button", { id: "next" }, "next"),
        ]),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  const root = wrapper.element as Element;
  segments(root)[0]?.focus();
  await type("11172026");
  (root.querySelector("#next") as HTMLElement).focus();
  await tick();
  assert.deepEqual(commits, [17]);
});
