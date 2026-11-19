import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTimeInputController,
  createTimeRangeInputController,
} from "../dist/time/index.js";
import { plainTime } from "../dist/foundation/index.js";

const base = {
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 14, 37),
};
const keys = { shift: false, ctrl: false, meta: false };
const iso = (
  t: { hour: number; minute: number; second: number } | null | undefined,
) =>
  t
    ? `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}:${String(t.second).padStart(2, "0")}`
    : null;
type C = ReturnType<typeof createTimeInputController>;
const type = (c: C, text: string) => {
  for (const ch of text) c.handleKeyDown(c.getState().focusedPart, ch, keys);
};
const seg = (c: C, part: string) =>
  c.getState().segments.find((s) => s.type === part);

test("12-hour layout: hour, minute, day period with placeholders", () => {
  const c = createTimeInputController(base);
  assert.deepEqual(
    c
      .getState()
      .segments.filter((s) => s.type !== "literal")
      .map((s) => s.type),
    ["hour", "minute", "dayPeriod"],
  );
  assert.equal(c.getState().pattern, "hh:mm --");
  assert.equal(c.getState().hourCycle, "h12");
});

test("12-hour typing: 9 30 p gives 21:30", () => {
  const changes: unknown[] = [];
  const c = createTimeInputController({
    ...base,
    onValueChange: (v) => changes.push(iso(v)),
  });
  type(c, "930p");
  assert.equal(iso(c.getState().value), "21:30:00");
  assert.deepEqual(changes, ["21:30:00"]);
  assert.equal(c.getState().validity, "valid");
});

test("12-hour typing rules: 12 stays, 13 restarts, 0 then 9", () => {
  const a = createTimeInputController(base);
  type(a, "12");
  assert.equal(seg(a, "hour")?.value, 12);
  assert.equal(a.getState().focusedPart, "minute");
  const b = createTimeInputController(base);
  type(b, "13");
  assert.equal(seg(b, "hour")?.value, 3);
  const c = createTimeInputController(base);
  type(c, "09");
  assert.equal(seg(c, "hour")?.value, 9);
  type(c, "00a");
  assert.equal(iso(c.getState().value), "09:00:00");
  const noon = createTimeInputController(base);
  type(noon, "1200a");
  assert.equal(iso(noon.getState().value), "00:00:00");
  const pm = createTimeInputController(base);
  type(pm, "1200p");
  assert.equal(iso(pm.getState().value), "12:00:00");
});

test("24-hour typing: 2 waits, 3 advances; seconds granularity", () => {
  const c = createTimeInputController({
    ...base,
    hourCycle: "h23",
    granularity: "second",
  });
  assert.deepEqual(
    c
      .getState()
      .segments.filter((s) => s.type !== "literal")
      .map((s) => s.type),
    ["hour", "minute", "second"],
  );
  type(c, "2");
  assert.equal(c.getState().focusedPart, "hour");
  type(c, "1");
  assert.equal(c.getState().focusedPart, "minute");
  type(c, "30");
  assert.equal(c.getState().focusedPart, "second");
  type(c, "05");
  assert.equal(iso(c.getState().value), "21:30:05");
  const three = createTimeInputController({ ...base, hourCycle: "h23" });
  type(three, "3");
  assert.equal(three.getState().focusedPart, "minute");
});

test("hour granularity has no minute part and zero minutes", () => {
  const c = createTimeInputController({
    ...base,
    hourCycle: "h23",
    granularity: "hour",
  });
  type(c, "14");
  assert.equal(iso(c.getState().value), "14:00:00");
});

test("arrows step by the configured step and wrap; empty starts at the placeholder", () => {
  const c = createTimeInputController({
    ...base,
    hourCycle: "h23",
    step: { minutes: 15 },
  });
  c.handleKeyDown("minute", "ArrowUp", keys);
  assert.equal(seg(c, "minute")?.value, 30); // now 14:37 floored to the 15 minute step
  c.handleKeyDown("minute", "ArrowUp", keys);
  assert.equal(seg(c, "minute")?.value, 45);
  c.handleKeyDown("minute", "ArrowUp", keys);
  assert.equal(seg(c, "minute")?.value, 0);
  c.handleKeyDown("hour", "ArrowDown", keys);
  assert.equal(seg(c, "hour")?.value, 14);
  const h = createTimeInputController({
    ...base,
    hourCycle: "h23",
    defaultValue: plainTime(0, 0),
  });
  h.handleKeyDown("hour", "ArrowDown", keys);
  assert.equal(seg(h, "hour")?.value, 23);
});

test("day period: typed letters, arrows toggle, locales", () => {
  const c = createTimeInputController({
    ...base,
    defaultValue: plainTime(9, 0),
  });
  c.handleKeyDown("dayPeriod", "ArrowUp", keys);
  assert.equal(iso(c.getState().value), "21:00:00");
  c.handleKeyDown("dayPeriod", "a", keys);
  assert.equal(iso(c.getState().value), "09:00:00");
  const zh = createTimeInputController({
    ...base,
    locale: "zh-CN",
    hourCycle: "h12",
    defaultValue: plainTime(9, 0),
  });
  const order = zh
    .getState()
    .segments.filter((s) => s.type !== "literal")
    .map((s) => s.type);
  assert.equal(order[0], "dayPeriod");
  zh.handleKeyDown("dayPeriod", "下", keys);
  assert.equal(iso(zh.getState().value), "21:00:00");
  const ko = createTimeInputController({
    ...base,
    locale: "ko-KR",
    hourCycle: "h12",
    defaultValue: plainTime(9, 0),
  });
  ko.handleKeyDown("dayPeriod", "오", keys);
  assert.equal(iso(ko.getState().value), "09:00:00");
  ko.handleKeyDown("dayPeriod", "후", keys);
  assert.equal(iso(ko.getState().value), "21:00:00");
});

test("validity: off-step is kept, min/max, disabled, unavailable", () => {
  const off = createTimeInputController({
    ...base,
    hourCycle: "h23",
    step: { minutes: 15 },
  });
  type(off, "0907");
  assert.equal(iso(off.getState().value), "09:07:00");
  assert.equal(off.getState().validity, "off-step");
  assert.equal(off.getRootAttributes()["data-invalid"], true);
  const range = createTimeInputController({
    ...base,
    hourCycle: "h23",
    min: "09:00",
    max: "17:00",
    defaultValue: plainTime(8, 0),
  });
  assert.equal(range.getState().validity, "before-min");
  range.setOptions({ defaultValue: undefined, value: plainTime(18, 0) });
  assert.equal(range.getState().validity, "after-max");
  const dis = createTimeInputController({
    ...base,
    hourCycle: "h23",
    disabledRanges: [{ start: "12:00", end: "13:00" }],
    defaultValue: plainTime(12, 30),
  });
  assert.equal(dis.getState().validity, "disabled");
  const un = createTimeInputController({
    ...base,
    hourCycle: "h23",
    isTimeUnavailable: (t) => t.hour === 3,
    defaultValue: plainTime(3, 0),
  });
  assert.equal(un.getState().validity, "unavailable");
  const empty = createTimeInputController({ ...base });
  assert.equal(empty.getState().validity, "empty");
  type(empty, "9");
  assert.equal(empty.getState().validity, "incomplete");
});

test("text mode: parse, reformat, invalid stays, Escape reverts", () => {
  const bad: string[] = [];
  const c = createTimeInputController({
    ...base,
    mode: "text",
    onInvalidInput: (t) => bad.push(t),
  });
  c.setText("9h30 pm");
  c.commitText();
  assert.equal(iso(c.getState().value), "21:30:00");
  assert.equal(c.getState().text.replace(/\s/g, " "), "9:30 PM");
  c.setText("hello");
  assert.equal(c.commitText(), false);
  assert.deepEqual(bad, ["hello"]);
  assert.equal(c.handleTextKeyDown("Escape"), true);
  assert.equal(c.getState().text.replace(/\s/g, " "), "9:30 PM");
});

test("paste, clear, reset, commit and the hidden value", () => {
  const commits: unknown[] = [];
  const c = createTimeInputController({
    ...base,
    hourCycle: "h23",
    name: "opens",
    defaultValue: plainTime(8, 0),
    onValueCommit: (v) => commits.push(iso(v)),
  });
  assert.deepEqual(c.getState().hidden, [{ name: "opens", value: "08:00" }]);
  assert.equal(c.paste("9:45 pm"), true);
  assert.equal(iso(c.getState().value), "21:45:00");
  c.commit();
  c.commit();
  assert.deepEqual(commits, ["21:45:00"]);
  c.clear();
  assert.deepEqual(c.getState().hidden, [{ name: "opens", value: "" }]);
  c.reset();
  assert.equal(iso(c.getState().value), "08:00:00");
  const sec = createTimeInputController({
    ...base,
    hourCycle: "h23",
    granularity: "second",
    name: "t",
    defaultValue: plainTime(8, 0, 5),
  });
  assert.equal(sec.getState().hidden[0]?.value, "08:00:05");
});

test("controlled null stays; outside value resets the parts", () => {
  const c = createTimeInputController({
    ...base,
    hourCycle: "h23",
    value: null,
  });
  type(c, "0930");
  assert.equal(c.getState().value, null);
  c.setOptions({ value: plainTime(11, 5) });
  assert.equal(seg(c, "hour")?.value, 11);
});

test("range input: validity, overnight, durations, names", () => {
  const commits: unknown[] = [];
  const r = createTimeRangeInputController({
    ...base,
    hourCycle: "h23",
    name: "shift",
    allowOvernight: true,
    minDuration: 60,
    onValueCommit: (v) => commits.push(`${iso(v.start)}..${iso(v.end)}`),
  });
  const s = r.getStart();
  const e = r.getEnd();
  for (const ch of "2300") s.handleKeyDown(s.getState().focusedPart, ch, keys);
  assert.equal(r.getState().validity, "incomplete");
  for (const ch of "0200") e.handleKeyDown(e.getState().focusedPart, ch, keys);
  assert.equal(r.getState().validity, "valid");
  assert.equal(r.getState().crossesMidnight, true);
  assert.equal(r.getState().duration, 180);
  r.commit();
  assert.deepEqual(commits, ["23:00:00..02:00:00"]);
  assert.deepEqual(r.getState().hidden, [
    { name: "shift-start", value: "23:00" },
    { name: "shift-end", value: "02:00" },
  ]);
  r.setOptions({ allowOvernight: false });
  assert.equal(r.getState().validity, "end-before-start");
  r.setOptions({ allowOvernight: true, minDuration: 240 });
  assert.equal(r.getState().validity, "too-short");
});
