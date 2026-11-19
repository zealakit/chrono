import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTimePanelController,
  createTimeRangePanelController,
} from "../dist/time/index.js";
import { plainTime } from "../dist/foundation/index.js";

const base = {
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 9, 10),
};
const keys = { shift: false, ctrl: false, meta: false };
const iso = (t: { hour: number; minute: number } | null | undefined) =>
  t
    ? `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`
    : null;
type Opt = {
  key: string;
  text: string;
  disabled: boolean;
  blocked: boolean;
  selected: boolean;
  focused: boolean;
  unavailable: boolean;
  label: string;
  now: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
};
const columns = (
  c: {
    getState(): { sets: { columns: { part: string; options: Opt[] }[] }[] };
  },
  set = 0,
) => c.getState().sets[set]?.columns ?? [];
const column = (c: Parameters<typeof columns>[0], part: string, set = 0) =>
  columns(c, set).find((x) => x.part === part)!.options;
const list = (c: {
  getState(): { groups: { key: string; label: string; options: Opt[] }[] };
}) => c.getState().groups.flatMap((g) => g.options);

test("columns: hour, minute and period columns; one focused option", () => {
  const c = createTimePanelController({ ...base, step: { minutes: 15 } });
  assert.deepEqual(
    columns(c).map((x) => x.part),
    ["hour", "minute", "dayPeriod"],
  );
  assert.deepEqual(
    column(c, "hour").map((o) => o.text),
    ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
  );
  assert.deepEqual(
    column(c, "minute").map((o) => o.text),
    ["00", "15", "30", "45"],
  );
  assert.equal(
    c
      .getState()
      .sets[0]?.columns.flatMap((x) => x.options)
      .filter((o) => o.focused).length,
    1,
  );
  const h23 = createTimePanelController({
    ...base,
    hourCycle: "h23",
    granularity: "second",
    step: { minutes: 30, seconds: 30 },
  });
  assert.deepEqual(
    columns(h23).map((x) => x.part),
    ["hour", "minute", "second"],
  );
  assert.equal(column(h23, "hour").length, 24);
  assert.equal(column(h23, "second").length, 2);
});

test("columns: picking fills the value and commits on the last column", () => {
  const changes: unknown[] = [];
  const commits: unknown[] = [];
  const c = createTimePanelController({
    ...base,
    onValueChange: (v) => changes.push(iso(v)),
    onValueCommit: (v) => commits.push(iso(v)),
  });
  c.pick("hour:9", "pointer");
  c.pick("minute:30", "pointer");
  assert.deepEqual(changes, []);
  c.pick("dayPeriod:1", "pointer");
  assert.deepEqual(changes, ["21:30"]);
  assert.deepEqual(commits, ["21:30"]);
  assert.equal(column(c, "hour").find((o) => o.selected)?.text, "9");
  c.pick("hour:10", "pointer");
  assert.deepEqual(changes, ["21:30", "22:30"]);
  assert.deepEqual(commits, ["21:30"]);
});

test("columns: disabled rules per column (T14)", () => {
  const c = createTimePanelController({
    ...base,
    hourCycle: "h23",
    min: "09:30",
    max: "17:00",
    disabledRanges: [{ start: "12:00", end: "13:00" }],
  });
  const hours = column(c, "hour");
  assert.equal(hours.find((o) => o.key === "hour:8")?.disabled, true);
  assert.equal(hours.find((o) => o.key === "hour:9")?.disabled, false);
  assert.equal(hours.find((o) => o.key === "hour:12")?.disabled, true);
  assert.equal(hours.find((o) => o.key === "hour:18")?.disabled, true);
  c.pick("hour:9", "pointer");
  const minutes = column(c, "minute");
  assert.equal(minutes.find((o) => o.key === "minute:15")?.disabled, true);
  assert.equal(minutes.find((o) => o.key === "minute:30")?.disabled, false);
  c.pick("hour:12", "pointer");
  assert.equal(
    c.getState().sets[0]?.columns[0]?.options.find((o) => o.key === "hour:12")
      ?.selected,
    false,
  );
});

test("columns: changing the hour clears a minute that became disabled", () => {
  const c = createTimePanelController({
    ...base,
    hourCycle: "h23",
    min: "09:30",
  });
  c.pick("hour:10", "pointer");
  c.pick("minute:5", "pointer");
  assert.equal(iso(c.getValue() as never), "10:05");
  c.pick("hour:9", "pointer");
  assert.equal(c.getValue(), null);
  assert.equal(
    column(c, "minute").some((o) => o.selected),
    false,
  );
});

test("columns: keyboard (one tab stop, arrows, paging, type-ahead, Enter)", () => {
  let clock = 0;
  const c = createTimePanelController({
    ...base,
    hourCycle: "h23",
    timer: () => clock,
  });
  const focus = () => c.getState().focusKey;
  assert.equal(focus(), "hour:0");
  c.handleKeyDown("ArrowDown", keys);
  assert.equal(focus(), "hour:1");
  c.handleKeyDown("PageDown", keys);
  assert.equal(focus(), "hour:4");
  c.handleKeyDown("End", keys);
  assert.equal(focus(), "hour:23");
  c.handleKeyDown("ArrowRight", keys);
  assert.equal(focus(), "minute:23");
  c.handleKeyDown("ArrowLeft", keys);
  c.handleKeyDown("Home", keys);
  clock = 1000;
  c.handleKeyDown("1", keys);
  c.handleKeyDown("5", keys);
  assert.equal(focus(), "hour:15");
  clock = 5000;
  c.handleKeyDown("0", keys);
  c.handleKeyDown("9", keys);
  assert.equal(focus(), "hour:9");
  c.handleKeyDown("Enter", keys);
  assert.equal(
    c.getState().sets[0]?.columns[0]?.options.find((o) => o.key === "hour:9")
      ?.selected,
    true,
  );
  const tabStops = c
    .getState()
    .sets.flatMap((s) => s.columns.flatMap((x) => x.options))
    .filter((o) => c.getOptionAttributes(o).tabindex === 0);
  assert.equal(tabStops.length, 1);
  assert.equal(c.handleKeyDown("Escape", keys), false);
});

test("list: entries by step, selection, commit with the slot", () => {
  const commits: unknown[] = [];
  const c = createTimePanelController({
    ...base,
    layout: "list",
    start: "09:00",
    end: "11:00",
    step: { minutes: 30 },
    onValueCommit: (v, info) => commits.push([iso(v), info.slot]),
  });
  assert.deepEqual(
    list(c).map((o) => o.key),
    ["09:00", "09:30", "10:00", "10:30"],
  );
  c.pick("09:30", "pointer");
  assert.deepEqual(commits, [["09:30", undefined]]);
  assert.equal(list(c).find((o) => o.selected)?.key, "09:30");
});

test("list: slots with data, unavailable slots, grouping by day period and hour", () => {
  const commits: unknown[] = [];
  const c = createTimePanelController({
    ...base,
    layout: "list",
    start: "11:00",
    end: "13:00",
    slotDuration: 30,
    groupBy: "dayPeriod",
    slots: undefined,
    isTimeUnavailable: (t) => t.hour === 11 && t.minute === 30,
    onValueCommit: (v, info) => commits.push([iso(v), info.slot?.endSecond]),
  });
  assert.equal(c.getState().groups.length, 2);
  assert.ok(c.getState().groups[0]?.label.length);
  const unavailable = list(c).find((o) => o.key === "11:30");
  assert.equal(unavailable?.unavailable, true);
  c.pick("11:30", "pointer");
  assert.deepEqual(commits, []);
  c.pick("12:00", "pointer");
  assert.deepEqual(commits, [["12:00", 12 * 3600 + 1800]]);
  assert.match(list(c).find((o) => o.key === "12:00")?.label ?? "", /–/);
  const hours = createTimePanelController({
    ...base,
    layout: "list",
    start: "09:00",
    end: "11:00",
    step: { minutes: 30 },
    groupBy: "hour",
  });
  assert.equal(hours.getState().groups.length, 2);
  const custom = createTimePanelController({
    ...base,
    layout: "list",
    start: "09:00",
    end: "11:00",
    step: { minutes: 30 },
    groupBy: (t) => ({
      key: t.minute === 0 ? "on" : "half",
      label: t.minute === 0 ? "On the hour" : "Half",
    }),
  });
  assert.equal(custom.getState().groups.length, 4);
  const explicit = createTimePanelController({
    ...base,
    layout: "list",
    slots: [{ start: "10:00", data: { who: "Ann" } }],
    slotDuration: 30,
  });
  assert.deepEqual(explicit.getSlot("10:00")?.data, { who: "Ann" });
  assert.equal(JSON.stringify(explicit.getState()).includes("Ann"), false);
});

test("list: now marker only when now is passed; keyboard and type-ahead", () => {
  const c = createTimePanelController({
    ...base,
    layout: "list",
    start: "09:00",
    end: "11:00",
    step: { minutes: 30 },
  });
  assert.equal(list(c).find((o) => o.now)?.key, "09:00");
  const noNow = createTimePanelController({
    layout: "list",
    start: "09:00",
    end: "11:00",
    step: { minutes: 30 },
  });
  assert.equal(
    list(noNow).some((o) => o.now),
    false,
  );
  c.handleKeyDown("ArrowDown", keys);
  assert.equal(c.getState().focusKey, "09:30");
  c.handleKeyDown("End", keys);
  assert.equal(c.getState().focusKey, "10:30");
  c.handleKeyDown("PageUp", keys);
  assert.equal(c.getState().focusKey, "09:30");
  const typed = createTimePanelController({
    ...base,
    hourCycle: "h23",
    layout: "list",
    start: "08:00",
    end: "12:00",
    step: { minutes: 60 },
  });
  typed.handleKeyDown("1", keys);
  typed.handleKeyDown("0", keys);
  assert.equal(typed.getState().focusKey, "10:00");
  const attrs = c.getListAttributes();
  assert.equal(attrs.role, "listbox");
});

test("list range: two picks, swap, slot end, preview, blocked, commit", () => {
  const commits: unknown[] = [];
  const previews: unknown[] = [];
  const c = createTimeRangePanelController({
    ...base,
    start: "09:00",
    end: "13:00",
    slotDuration: 30,
    maxDuration: 150,
    onValueCommit: (v) => commits.push(`${iso(v.start)}..${iso(v.end)}`),
    onRangePreviewChange: (p) =>
      previews.push(p ? `${iso(p.start)}..${iso(p.end)}` : null),
  });
  c.pick("10:00", "pointer");
  assert.equal(c.getState().draft, true);
  assert.equal(c.getState().layout, "list");
  assert.equal(list(c).find((o) => o.key === "12:30")?.blocked, true); // 10:00 → 13:00 is 180 min
  assert.equal(list(c).find((o) => o.key === "12:00")?.blocked, false);
  c.setPreview("11:00");
  assert.equal(previews.at(-1), "10:00..11:30");
  c.pick("12:00", "pointer"); // 10:00 → 12:30 is 150 min: allowed
  assert.deepEqual(commits, ["10:00..12:30"]);
  c.pick("11:00", "pointer");
  c.pick("09:00", "pointer"); // swap: 09:00 → 11:30
  assert.deepEqual(commits, ["10:00..12:30", "09:00..11:30"]);
  assert.equal(c.getState().duration, 150);
  const mark = list(c);
  assert.equal(mark.find((o) => o.key === "09:00")?.rangeStart, true);
  assert.equal(mark.find((o) => o.key === "11:00")?.rangeEnd, true);
  assert.equal(mark.find((o) => o.key === "10:00")?.inRange, true);
});

test("list range: Escape cancels a draft, invalid picks report the reason", () => {
  const reasons: unknown[] = [];
  const c = createTimeRangePanelController({
    ...base,
    start: "09:00",
    end: "12:00",
    slotDuration: 30,
    minDuration: 90,
    onInvalidRange: (r) => reasons.push(r),
    defaultValue: { start: plainTime(9, 0), end: plainTime(10, 0) },
  });
  c.pick("10:00", "pointer");
  c.pick("10:30", "pointer");
  assert.deepEqual(reasons, ["too-short"]);
  assert.equal(c.handleKeyDown("Escape", keys), true);
  assert.equal(c.getState().draft, false);
  assert.equal(iso((c.getValue() as unknown as { end: never }).end), "10:00");
  assert.equal(c.handleKeyDown("Escape", keys), false);
});

test("list range: overnight picks and point mode without slots", () => {
  const night = createTimeRangePanelController({
    ...base,
    start: "20:00",
    end: "23:00",
    slotDuration: 60,
    allowOvernight: true,
  });
  night.pick("22:00", "pointer");
  night.pick("20:00", "pointer");
  assert.equal(night.getState().crossesMidnight, true);
  const point = createTimeRangePanelController({
    ...base,
    start: "09:00",
    end: "12:00",
    step: { minutes: 30 },
  });
  point.pick("10:00", "pointer");
  point.pick("11:00", "pointer");
  assert.equal(
    iso((point.getValue() as unknown as { end: never }).end),
    "11:00",
  );
});

test("columns range: two column sets, blocked end options, commit from the end set", () => {
  const commits: unknown[] = [];
  const c = createTimeRangePanelController({
    ...base,
    layout: "columns",
    hourCycle: "h23",
    minDuration: 60,
    onValueCommit: (v) => commits.push(`${iso(v.start)}..${iso(v.end)}`),
  });
  assert.equal(c.getState().sets.length, 2);
  assert.deepEqual(
    c.getState().sets.map((s) => s.key),
    ["start", "end"],
  );
  c.pick("start:hour:9", "pointer");
  c.pick("start:minute:0", "pointer");
  const endHours = column(c, "hour", 1);
  assert.equal(endHours.find((o) => o.key === "end:hour:8")?.blocked, true);
  assert.equal(endHours.find((o) => o.key === "end:hour:9")?.blocked, true); // 09:59 is only 59 minutes
  assert.equal(endHours.find((o) => o.key === "end:hour:10")?.blocked, false);
  c.pick("end:hour:10", "pointer");
  assert.deepEqual(commits, []);
  c.pick("end:minute:30", "pointer");
  assert.deepEqual(commits, ["09:00..10:30"]);
  c.pick("start:hour:12", "pointer");
  assert.equal(
    column(c, "hour", 1).find((o) => o.key === "end:hour:10")?.blocked,
    true,
  );
});

test("attributes: contract, no handlers, ARIA", () => {
  const c = createTimePanelController({
    ...base,
    layout: "list",
    start: "09:00",
    end: "10:00",
    step: { minutes: 30 },
  });
  assert.equal(c.getRootAttributes()["data-chrono-time-panel"], true);
  const option = list(c)[0] as Opt;
  const attrs = c.getOptionAttributes(option as never);
  assert.equal(attrs.role, "option");
  for (const key of Object.keys(attrs))
    assert.ok(!["class", "style"].includes(key) && !key.startsWith("on"), key);
  const range = createTimeRangePanelController({ ...base });
  assert.equal(range.getRootAttributes()["data-chrono-time-panel"], "range");
  assert.equal(range.getListAttributes()["aria-multiselectable"], "true");
  const cols = createTimePanelController(base);
  assert.equal(
    cols.getColumnAttributes(cols.getState().sets[0]!.columns[0]!).role,
    "listbox",
  );
});

test("readOnly and disabled", () => {
  const ro = createTimePanelController({ ...base, readOnly: true });
  ro.pick("hour:9", "pointer");
  assert.equal(ro.getState().focusKey, "hour:9");
  assert.equal(
    column(ro, "hour").some((o) => o.selected),
    false,
  );
  const off = createTimePanelController({ ...base, disabled: true });
  assert.equal(off.handleKeyDown("ArrowDown", keys), false);
});
