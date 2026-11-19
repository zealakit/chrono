import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { plainTime } from "@zealakit/chrono-core/foundation";
import { resetDom } from "./support/dom.ts";
import {
  cleanupFixtures,
  entryUrl,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { click, press } from "./support/scenarios.ts";

const base = {
  id: "t",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 9, 10),
};
const live: Mounted[] = [];
afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

const source = (component: string, body = "", extra = "") => `
<script>
  import { ${component}, ${extra} } from "${entryUrl}";
  let { initial = {} } = $props();
  let options = $state(initial);
  export function update(next) { options = next; }
</script>
${body || `<${component} {...options} />`}`;
const open = async (src: string, options: object = base) => {
  const mounted = await mountSource(src, options);
  live.push(mounted);
  return mounted.target;
};
const opt = (root: Element, key: string) =>
  root.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const key = async (target: Element, name: string) => {
  press(target, name);
  await settle();
};
const type = async (text: string) => {
  for (const ch of text) await key(document.activeElement as Element, ch);
};

test("columns panel: listboxes, one tab stop, commit on the last column", async () => {
  const commits: number[] = [];
  const root = await open(source("TimePanel"), {
    ...base,
    onValueCommit: (v: { hour: number }) => commits.push(v.hour),
  });
  assert.equal(root.querySelectorAll('[role="listbox"]').length, 3);
  assert.equal(
    root.querySelectorAll('[role="option"][tabindex="0"]').length,
    1,
  );
  click(opt(root, "hour:9"));
  await settle();
  click(opt(root, "minute:30"));
  await settle();
  assert.deepEqual(commits, []);
  click(opt(root, "dayPeriod:1"));
  await settle();
  assert.deepEqual(commits, [21]);
  assert.equal(opt(root, "hour:9").getAttribute("aria-selected"), "true");
});

test("columns panel: keyboard", async () => {
  const root = await open(source("TimePanel"), { ...base, hourCycle: "h23" });
  opt(root, "hour:0").focus();
  await key(document.activeElement as Element, "ArrowDown");
  assert.equal(document.activeElement, opt(root, "hour:1"));
  await key(document.activeElement as Element, "ArrowRight");
  assert.equal(document.activeElement, opt(root, "minute:1"));
});

test("list panel, slot data in custom content, range list panel", async () => {
  const root = await open(source("TimePanel"), {
    ...base,
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
  const body = `<TimePanel {...options}><TimePanelList>{#snippet children(groups)}{#each groups as group (group.key)}{#each group.options as option (option.key)}<TimePanelOption {option}>{#snippet children(o, slot)}{slot?.data?.who}{/snippet}</TimePanelOption>{/each}{/each}{/snippet}</TimePanelList></TimePanel>`;
  const custom = await open(
    source("TimePanel", body, "TimePanelList, TimePanelOption"),
    {
      ...base,
      id: "c",
      layout: "list",
      slotDuration: 30,
      slots: [{ start: "09:00", data: { who: "Ann" } }],
    },
  );
  assert.equal(custom.querySelector('[role="option"]')?.textContent, "Ann");
  const commits: string[] = [];
  const range = await open(source("TimeRangePanel"), {
    ...base,
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
  await settle();
  assert.ok(opt(range, "12:30").hasAttribute("data-range-blocked"));
  opt(range, "11:00").dispatchEvent(
    new window.MouseEvent("mouseenter", { bubbles: false }),
  );
  await settle();
  assert.ok(opt(range, "10:30").hasAttribute("data-range-preview"));
  click(opt(range, "12:00"));
  await settle();
  assert.deepEqual(commits, ["10-12:30"]);
});

test("range columns panel and Escape", async () => {
  const root = await open(source("TimeRangePanel"), {
    ...base,
    layout: "columns",
    hourCycle: "h23",
    minDuration: 60,
  });
  assert.equal(
    root.querySelectorAll('[role="group"][data-chrono-set]').length,
    2,
  );
  click(opt(root, "start:hour:9"));
  await settle();
  click(opt(root, "start:minute:0"));
  await settle();
  assert.ok(opt(root, "end:hour:9").hasAttribute("data-range-blocked"));
  let seen = 0;
  const body = `<div onkeydown={() => options.seen()}><TimeRangePanel {...options} /></div>`;
  const esc = await open(source("TimeRangePanel", body), {
    ...base,
    id: "e",
    start: "09:00",
    end: "12:00",
    slotDuration: 30,
    seen: () => {
      seen += 1;
    },
  });
  opt(esc, "09:00").focus();
  await key(document.activeElement as Element, "Escape");
  assert.equal(seen, 1);
  click(opt(esc, "09:00"));
  await settle();
  await key(document.activeElement as Element, "Escape");
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
    const root = await open(source("TimePanel"), { ...base, hourCycle: "h23" });
    opt(root, "hour:0").focus();
    await key(document.activeElement as Element, "ArrowDown");
    assert.ok(calls.includes(opt(root, "hour:1")));
  } finally {
    proto.scrollIntoView = original;
  }
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
  const off = await open(source("TimePanel"), { ...base, id: "o" });
  assert.equal(off.querySelectorAll("[style], [class]").length, 0);
  assert.notEqual(document.activeElement?.getAttribute("role"), "option");
  await open(source("TimePanel"), { ...base, id: "a", autoFocus: true });
  assert.equal(document.activeElement?.getAttribute("role"), "option");
});

test("input: typing, clear button, hidden value, text mode, range input", async () => {
  const body = `<TimeInput {...options}><TimeInputClearButton /></TimeInput>`;
  const root = await open(source("TimeInput", body, "TimeInputClearButton"), {
    ...base,
    defaultValue: plainTime(8, 0),
    name: "opens",
  });
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "08:00",
  );
  click(root.querySelector("button") as Element);
  await settle();
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "",
  );
  const fresh = await open(source("TimeInput"), { ...base, id: "f" });
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
  const text = await open(source("TimeInput"), {
    ...base,
    id: "t2",
    mode: "text",
  });
  const input = text.querySelector("input[type=text]") as HTMLInputElement;
  input.value = "9.30 pm";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle();
  input.dispatchEvent(new window.FocusEvent("blur"));
  await settle();
  assert.equal(input.value.replace(/\s/g, " "), "9:30 PM");
  const range = await open(source("TimeRangeInput"), {
    ...base,
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

test("input and panel share a controlled value", async () => {
  const mounted = await mountSource(source("TimePanel"), {
    ...base,
    value: null,
  });
  live.push(mounted);
  await mounted.update({ ...base, value: plainTime(9, 30) });
  assert.equal(
    opt(mounted.target, "hour:9").getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    opt(mounted.target, "minute:30").getAttribute("aria-selected"),
    "true",
  );
});
