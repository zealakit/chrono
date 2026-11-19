import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mount, type VueWrapper } from "@vue/test-utils";
import { plainTime } from "@zealakit/chrono-core/foundation";
import { defineComponent, h, nextTick, ref } from "vue";
import {
  TimeInput,
  TimeInputClearButton,
  TimePanel,
  TimePanelColumn,
  TimeRangeInput,
  TimeRangePanel,
} from "../dist/time/index.js";
import { resetDom } from "./support/dom.ts";
import { click, press } from "./support/scenarios.ts";

const base = {
  id: "t",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 9, 10),
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
const opt = (root: Element, key: string) =>
  root.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const type = async (text: string) => {
  for (const key of text) {
    press(document.activeElement as Element, key);
    await tick();
  }
};

test("columns panel: listboxes, one tab stop, commit on the last column", async () => {
  const commits: number[] = [];
  const root = mountIt(TimePanel, {
    onValueCommit: (v: { hour: number }) => commits.push(v.hour),
  });
  assert.equal(root.querySelectorAll('[role="listbox"]').length, 3);
  assert.equal(
    root.querySelectorAll('[role="option"][tabindex="0"]').length,
    1,
  );
  click(opt(root, "hour:9"));
  await tick();
  click(opt(root, "minute:30"));
  await tick();
  assert.deepEqual(commits, []);
  click(opt(root, "dayPeriod:1"));
  await tick();
  assert.deepEqual(commits, [21]);
  assert.equal(opt(root, "hour:9").getAttribute("aria-selected"), "true");
});

test("columns panel: keyboard", async () => {
  const root = mountIt(TimePanel, { hourCycle: "h23" });
  opt(root, "hour:0").focus();
  press(document.activeElement as Element, "ArrowDown");
  await tick();
  assert.equal(document.activeElement, opt(root, "hour:1"));
  press(document.activeElement as Element, "ArrowRight");
  await tick();
  assert.equal(document.activeElement, opt(root, "minute:1"));
});

test("list panel and range list panel", async () => {
  const root = mountIt(TimePanel, {
    layout: "list",
    start: "09:00",
    end: "12:00",
    slotDuration: 30,
    groupBy: "hour",
  });
  assert.equal(
    root.querySelectorAll('[role="group"] [role="option"]').length,
    6,
  );
  assert.equal(root.querySelectorAll('[role="group"]').length, 3);
  const commits: string[] = [];
  const range = mountIt(TimeRangePanel, {
    id: "r",
    start: "09:00",
    end: "13:00",
    slotDuration: 30,
    maxDuration: 150,
    onValueCommit: (r: {
      start: { hour: number };
      end: { hour: number; minute: number };
    }) => commits.push(`${r.start.hour}-${r.end.hour}:${r.end.minute}`),
  });
  click(opt(range, "10:00"));
  await tick();
  assert.ok(opt(range, "12:30").hasAttribute("data-range-blocked"));
  opt(range, "11:00").dispatchEvent(
    new window.MouseEvent("mouseenter", { bubbles: false }),
  );
  await tick();
  assert.ok(opt(range, "10:30").hasAttribute("data-range-preview"));
  click(opt(range, "12:00"));
  await tick();
  assert.deepEqual(commits, ["10-12:30"]);
});

test("range columns panel", async () => {
  const root = mountIt(TimeRangePanel, {
    layout: "columns",
    hourCycle: "h23",
    minDuration: 60,
  });
  assert.equal(
    root.querySelectorAll('[role="group"][data-chrono-set]').length,
    2,
  );
  click(opt(root, "start:hour:9"));
  await tick();
  click(opt(root, "start:minute:0"));
  await tick();
  assert.ok(opt(root, "end:hour:9").hasAttribute("data-range-blocked"));
  assert.ok(!opt(root, "end:hour:10").hasAttribute("data-range-blocked"));
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
          h(TimeRangePanel, {
            ...base,
            start: "09:00",
            end: "12:00",
            slotDuration: 30,
          } as never),
        ),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  const root = wrapper.element as Element;
  // Vue ignores events stamped before a listener was attached; let the clock move on.
  await new Promise((resolve) => setTimeout(resolve, 20));
  opt(root, "09:00").focus();
  assert.equal(document.activeElement, opt(root, "09:00"));
  press(document.activeElement as Element, "Escape");
  await tick();
  assert.equal(seen, 1);
  click(opt(root, "09:00"));
  await tick();
  press(document.activeElement as Element, "Escape");
  await tick();
  assert.equal(seen, 1);
});

test("scrollIntoView on keyboard moves; autoFocus opt-in; no styles", async () => {
  const calls: Element[] = [];
  const proto = window.HTMLElement.prototype as unknown as {
    scrollIntoView?: (this: Element) => void;
  };
  const original = proto.scrollIntoView;
  proto.scrollIntoView = function (this: Element) {
    calls.push(this);
  };
  try {
    const root = mountIt(TimePanel, { hourCycle: "h23" });
    opt(root, "hour:0").focus();
    press(document.activeElement as Element, "ArrowDown");
    await tick();
    assert.ok(calls.includes(opt(root, "hour:1")));
  } finally {
    proto.scrollIntoView = original;
  }
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  resetDom();
  (document.activeElement as HTMLElement | null)?.blur?.();
  const off = mountIt(TimePanel, { id: "o" });
  assert.notEqual(document.activeElement?.getAttribute("role"), "option");
  assert.equal(off.querySelectorAll("[style], [class]").length, 0);
  mountIt(TimePanel, { id: "a", autoFocus: true });
  assert.equal(document.activeElement?.getAttribute("role"), "option");
});

test("controlled value shared by input and panel", async () => {
  const value = ref<unknown>(null);
  const wrapper = mount(
    defineComponent({
      render: () =>
        h("div", null, [
          h(TimeInput, {
            ...base,
            id: "i",
            value: value.value,
            "onUpdate:value": (v: unknown) => {
              value.value = v;
            },
          } as never),
          h(TimePanel, {
            ...base,
            id: "p",
            value: value.value,
            "onUpdate:value": (v: unknown) => {
              value.value = v;
            },
          } as never),
        ]),
    }),
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  const root = wrapper.element as Element;
  segments(root)[0]?.focus();
  await type("0930p");
  assert.equal(opt(root, "hour:9").getAttribute("aria-selected"), "true");
  assert.equal(opt(root, "dayPeriod:1").getAttribute("aria-selected"), "true");
  click(opt(root, "minute:45"));
  await tick();
  assert.equal(segments(root)[1]?.textContent, "45");
});

test("input: typing, clear button, hidden value, text mode, range input", async () => {
  const root = mountIt(
    TimeInput,
    { defaultValue: plainTime(8, 0), name: "opens" },
    { default: () => h(TimeInputClearButton) },
  );
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "08:00",
  );
  click(root.querySelector("button") as Element);
  await tick();
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "",
  );
  const fresh = mountIt(TimeInput, { id: "f" });
  assert.deepEqual(
    segments(fresh).map((s) => s.textContent),
    ["hh", "mm", "--"],
  );
  segments(fresh)[0]?.focus();
  await type("0930p");
  assert.deepEqual(
    segments(fresh).map((s) => s.textContent),
    ["09", "30", "PM"],
  );
  const text = mountIt(TimeInput, { id: "t2", mode: "text" });
  const input = text.querySelector("input[type=text]") as HTMLInputElement;
  input.value = "9.30 pm";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  input.dispatchEvent(new window.FocusEvent("blur"));
  await tick();
  assert.equal(input.value.replace(/\s/g, " "), "9:30 PM");
  const range = mountIt(TimeRangeInput, {
    id: "r",
    name: "shift",
    allowOvernight: true,
    hourCycle: "h23",
    defaultValue: { start: plainTime(23, 0), end: plainTime(2, 0) },
  });
  assert.equal(range.querySelectorAll("[data-chrono-time-input]").length, 2);
  assert.deepEqual(
    [...range.querySelectorAll("input[type=hidden]")].map(
      (i) => (i as HTMLInputElement).value,
    ),
    ["23:00", "02:00"],
  );
});

test("parts throw outside a panel", () => {
  assert.throws(
    () => mount(TimePanelColumn as never, { props: { column: {} } } as never),
    /must be used inside/,
  );
});
