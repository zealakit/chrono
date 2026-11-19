import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import {
  plainDate,
  plainDateTime,
  plainTime,
} from "@zealakit/chrono-core/foundation";
import { resetDom } from "./support/dom.ts";
import {
  cleanupFixtures,
  entryUrl,
  mountSource,
  settle,
  type Mounted,
} from "./support/reference.ts";
import { click, press } from "./support/scenarios.ts";

const base = { id: "dt", locale: "en-US", now: Date.UTC(2026, 10, 17, 9, 10) };
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
const key = (root: Element, k: string) =>
  root.querySelector(`[data-chrono-key="${k}"]`) as HTMLElement;
const segments = (root: Element) =>
  [...root.querySelectorAll("[data-chrono-part]")] as HTMLElement[];
const type = async (text: string) => {
  for (const ch of text) {
    press(document.activeElement as Element, ch);
    await settle();
  }
};

test("input: one segment group, focus crosses the boundary", async () => {
  const changes: string[] = [];
  const root = await open(source("DateTimeInput"), {
    ...base,
    hourCycle: "h23",
    onValueChange: (v: { hour: number; minute: number } | null) =>
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

test("input: zone label, adjusted gap, hidden offset value", async () => {
  const body = `<DateTimeInput {...options}><DateTimeInputTimeZone /></DateTimeInput>`;
  const labelled = await open(
    source("DateTimeInput", body, "DateTimeInputTimeZone"),
    { ...base, timeZone: "America/New_York" },
  );
  assert.equal(
    labelled.querySelector("span")?.getAttribute("aria-hidden"),
    null,
  );
  assert.ok(labelled.textContent?.length);
  const root = await open(source("DateTimeInput"), {
    ...base,
    id: "z",
    hourCycle: "h23",
    timeZone: "America/New_York",
    name: "at",
  });
  segments(root)[0]?.focus();
  await type("030820260230");
  assert.ok(root.firstElementChild?.hasAttribute("data-adjusted"));
  assert.equal(
    (root.querySelector("input[type=hidden]") as HTMLInputElement).value,
    "2026-03-08T03:30-04:00",
  );
});

test("input: text mode paste, clear button, range input", async () => {
  const text = await open(source("DateTimeInput"), {
    ...base,
    mode: "text",
    hourCycle: "h23",
  });
  const fields = [
    ...text.querySelectorAll("input[type=text]"),
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
  await settle();
  assert.equal(fields[1]?.value.replace(/\s/g, " "), "18:15");
  const body = `<DateTimeInput {...options}><DateTimeInputClearButton /></DateTimeInput>`;
  const clear = await open(
    source("DateTimeInput", body, "DateTimeInputClearButton"),
    {
      ...base,
      id: "c",
      defaultValue: plainDateTime(plainDate(2026, 5, 1), plainTime(8, 0)),
    },
  );
  click(clear.querySelector("button") as Element);
  await settle();
  assert.equal(clear.querySelectorAll("[data-chrono-part]").length, 0);
  const range = await open(source("DateTimeRangeInput"), {
    ...base,
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

test("panel: pick a day then a time; commit only from the time part; disablePast", async () => {
  const changes: string[] = [];
  const commits: string[] = [];
  const root = await open(source("DateTimePanel"), {
    ...base,
    timeZone: "UTC",
    time: { hourCycle: "h23" },
    disablePast: true,
    onValueChange: (v: { day: number; hour: number; minute: number } | null) =>
      changes.push(v ? `${v.day} ${v.hour}:${v.minute}` : "null"),
    onValueCommit: (v: { day: number; hour: number; minute: number }) =>
      commits.push(`${v.day} ${v.hour}:${v.minute}`),
  });
  assert.equal(key(root, "2026-11-16").getAttribute("aria-disabled"), "true");
  click(key(root, "2026-11-20"));
  await settle();
  assert.deepEqual(changes, []);
  click(key(root, "hour:9"));
  await settle();
  click(key(root, "minute:30"));
  await settle();
  assert.deepEqual(changes, ["20 9:30"]);
  assert.deepEqual(commits, ["20 9:30"]);
  click(key(root, "2026-11-17"));
  await settle();
  assert.equal(key(root, "hour:8").getAttribute("aria-disabled"), "true");
  assert.equal(
    root.querySelector("[data-chrono-datetime-panel]") !== null,
    true,
  );
});

test("range panel: commit on the end time; no styles", async () => {
  const commits: string[] = [];
  const root = await open(source("DateTimeRangePanel"), {
    ...base,
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
  await settle();
  click(key(root, "2026-11-20"));
  await settle();
  click(key(panels[0] as Element, "hour:14"));
  await settle();
  click(key(panels[0] as Element, "minute:0"));
  await settle();
  assert.equal(
    key(panels[1] as Element, "hour:13").getAttribute("aria-disabled"),
    "true",
  );
  click(key(panels[1] as Element, "hour:15"));
  await settle();
  click(key(panels[1] as Element, "minute:30"));
  await settle();
  assert.deepEqual(commits, ["14-15:30"]);
  assert.equal(root.querySelectorAll("[style], [class]").length, 0);
});
