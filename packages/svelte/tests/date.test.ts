import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { plainDate } from "@zealakit/chrono-core/foundation";
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
  id: "d",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
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
const cell = (root: Element, key: string) =>
  root.querySelector(`[data-chrono-key="${key}"]`) as HTMLElement;
const title = (root: Element) => root.querySelector("h2")?.textContent;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const key = async (target: Element, name: string, init: object = {}) => {
  const result = press(target, name, init);
  await settle();
  return result;
};
const type = async (text: string) => {
  for (const ch of text) await key(document.activeElement as Element, ch);
};

test("panel: grid, roving tabindex, selection", async () => {
  const root = await open(source("DatePanel"), {
    ...base,
    defaultValue: plainDate(2026, 11, 20),
  });
  assert.equal(title(root), "November 2026");
  const stops = root.querySelectorAll('[data-chrono-key][tabindex="0"]');
  assert.equal(stops.length, 1);
  assert.equal(stops[0]?.getAttribute("data-chrono-key"), "2026-11-20");
  assert.equal(cell(root, "2026-11-20").getAttribute("aria-selected"), "true");
  assert.equal(cell(root, "2026-11-17").getAttribute("aria-current"), "date");
});

test("panel: click picks and commits once; keys move focus", async () => {
  const commits: number[] = [];
  const root = await open(source("DatePanel"), {
    ...base,
    onValueCommit: (v: { day: number }) => commits.push(v.day),
  });
  click(cell(root, "2026-11-12"));
  await settle();
  assert.deepEqual(commits, [12]);
  cell(root, "2026-11-12").focus();
  await key(document.activeElement as Element, "ArrowRight");
  assert.equal(document.activeElement, cell(root, "2026-11-13"));
});

test("panel: composition, paging and levels", async () => {
  const body = `<DatePanel {...options}><DatePanelPrevButton /><DatePanelLevelButton /><DatePanelNextButton /><DatePanelTodayButton /><DatePanelGrid /></DatePanel>`;
  const root = await open(
    source(
      "DatePanel",
      body,
      "DatePanelPrevButton, DatePanelLevelButton, DatePanelNextButton, DatePanelTodayButton, DatePanelGrid",
    ),
  );
  const buttons = root.querySelectorAll("button");
  click(buttons[2] as Element);
  await settle();
  assert.equal(buttons[1]?.textContent, "December 2026");
  click(buttons[1] as Element);
  await settle();
  assert.equal(root.querySelectorAll("td[data-chrono-key]").length, 12);
  click(cell(root, "2026-03"));
  await settle();
  assert.equal(buttons[1]?.textContent, "March 2026");
  click(buttons[3] as Element);
  await settle();
  assert.equal(buttons[1]?.textContent, "November 2026");
});

test("range panel: two months, preview, blocked, commit", async () => {
  const commits: string[] = [];
  const root = await open(source("DateRangePanel"), {
    ...base,
    maxDays: 5,
    onValueCommit: (r: { start: { day: number }; end: { day: number } }) =>
      commits.push(`${r.start.day}-${r.end.day}`),
  });
  assert.equal(root.querySelectorAll("table").length, 2);
  click(cell(root, "2026-11-10"));
  await settle();
  assert.equal(
    cell(root, "2026-11-20").hasAttribute("data-range-blocked"),
    true,
  );
  cell(root, "2026-11-12").dispatchEvent(
    new window.MouseEvent("mouseenter", { bubbles: false }),
  );
  await settle();
  assert.equal(
    cell(root, "2026-11-11").hasAttribute("data-range-preview"),
    true,
  );
  click(cell(root, "2026-11-12"));
  await settle();
  assert.deepEqual(commits, ["10-12"]);
});

test("Escape bubbles unless it cancels a draft", async () => {
  let seen = 0;
  const body = `<div onkeydown={() => options.seen()}><DateRangePanel {...options} /></div>`;
  const root = await open(source("DateRangePanel", body), {
    ...base,
    seen: () => {
      seen += 1;
    },
  });
  cell(root, "2026-11-10").focus();
  await key(document.activeElement as Element, "Escape");
  assert.equal(seen, 1);
  click(cell(root, "2026-11-10"));
  await settle();
  await key(document.activeElement as Element, "Escape");
  assert.equal(seen, 1);
  assert.equal(root.querySelectorAll("[data-range-start]").length, 0);
});

test("multi panel: shift-click span", async () => {
  const root = await open(source("MultiDatePanel"), {
    ...base,
    maxSelected: 4,
  });
  click(cell(root, "2026-11-03"));
  await settle();
  cell(root, "2026-11-05").dispatchEvent(
    new window.MouseEvent("click", { bubbles: true, shiftKey: true }),
  );
  await settle();
  assert.equal(root.querySelectorAll('[aria-selected="true"]').length, 3);
});

test("autoFocus is opt-in; no styles", async () => {
  const off = await open(source("DatePanel"));
  assert.notEqual(document.activeElement, cell(off, "2026-11-17"));
  assert.equal(off.querySelectorAll("[style], [class]").length, 0);
  const on = await open(source("DatePanel"), {
    ...base,
    id: "x",
    autoFocus: true,
  });
  assert.equal(document.activeElement, cell(on, "2026-11-17"));
});

test("controlled value follows", async () => {
  const mounted = await mountSource(source("DatePanel"), {
    ...base,
    value: null,
  });
  live.push(mounted);
  await mounted.update({ ...base, value: plainDate(2027, 3, 9) });
  assert.equal(title(mounted.target), "March 2027");
  assert.equal(
    cell(mounted.target, "2027-03-09").getAttribute("aria-selected"),
    "true",
  );
});

test("input: typing, advance and change", async () => {
  const changes: number[] = [];
  const root = await open(source("DateInput"), {
    ...base,
    onValueChange: (v: { day: number } | null) => changes.push(v?.day ?? -1),
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

test("input: clear button and disabled", async () => {
  const body = `<DateInput {...options}><DateInputClearButton /></DateInput>`;
  const root = await open(source("DateInput", body, "DateInputClearButton"), {
    ...base,
    defaultValue: plainDate(2026, 5, 1),
  });
  click(root.querySelector("button") as Element);
  await settle();
  assert.equal(root.querySelectorAll("[data-chrono-part]").length, 0);
  const off = await open(source("DateInput"), { ...base, disabled: true });
  assert.equal(off.firstElementChild?.getAttribute("aria-disabled"), "true");
});

test("input: text mode parses on blur and keeps invalid text", async () => {
  const root = await open(source("DateInput"), { ...base, mode: "text" });
  const input = root.querySelector("input[type=text]") as HTMLInputElement;
  input.value = "Nov 17 2026";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle();
  input.dispatchEvent(new window.FocusEvent("blur"));
  await settle();
  assert.equal(input.value, "11/17/2026");
  input.value = "garbage";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  input.dispatchEvent(new window.FocusEvent("blur"));
  await settle();
  assert.equal(input.getAttribute("aria-invalid"), "true");
});

test("input: hidden value and form reset", async () => {
  const body = `<form><DateInput {...options} /></form>`;
  const root = await open(source("DateInput", body), {
    ...base,
    name: "when",
    defaultValue: plainDate(2026, 5, 1),
  });
  const hidden = () =>
    root.querySelector("input[type=hidden]") as HTMLInputElement;
  assert.equal(hidden().value, "2026-05-01");
  segments(root)[0]?.focus();
  await key(document.activeElement as Element, "End");
  assert.equal(hidden().value, "2026-12-01");
  root.querySelector("form")?.dispatchEvent(new window.Event("reset"));
  await settle();
  assert.equal(hidden().value, "2026-05-01");
});

test("range input: two groups and names", async () => {
  const root = await open(source("DateRangeInput"), {
    ...base,
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
  const body = `<div><DateInput {...options} /><button id="next">next</button></div>`;
  const root = await open(source("DateInput", body), {
    ...base,
    onValueCommit: (v: { day: number }) => commits.push(v.day),
  });
  segments(root)[0]?.focus();
  await type("11172026");
  (root.querySelector("#next") as HTMLElement).focus();
  await settle();
  assert.deepEqual(commits, [17]);
});
