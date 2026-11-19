import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  createDateTimeInputController,
  createDateTimeRangeInputController,
  createDateTimePanelController,
  createDateTimeRangePanelController,
  parseDateTime,
  resolveWall,
} from "../dist/datetime/index.js";
import {
  plainDate,
  plainDateTime,
  plainTime,
  toInstant,
  toIsoString,
} from "../dist/foundation/index.js";

const keys = { shift: false, ctrl: false, meta: false };
const base = { locale: "en-US", now: Date.UTC(2026, 10, 17, 9, 10) };
const fmt = (
  v:
    | { year: number; month: number; day: number; hour: number; minute: number }
    | null
    | undefined,
) =>
  v
    ? `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")} ${String(v.hour).padStart(2, "0")}:${String(v.minute).padStart(2, "0")}`
    : null;

const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/datetime-parse.json", import.meta.url),
    "utf8",
  ),
) as {
  timeZone: string;
  cases: { locale: string; input: string; result: string }[];
};
for (const { locale, input, result } of fixture.cases) {
  test(`parseDateTime ${locale} "${input}"`, () => {
    const parsed = parseDateTime(input, { locale, timeZone: fixture.timeZone });
    const text =
      "error" in parsed
        ? parsed.error
        : `${parsed.date ? toIsoString(parsed.date) : "-"} ${parsed.time ? toIsoString(parsed.time).slice(0, 5) : "-"}`;
    assert.equal(text, result);
  });
}

type C = ReturnType<typeof createDateTimeInputController>;
const type = (c: C, text: string) => {
  for (const ch of text) c.handleKeyDown(c.getState().focusedPart, ch, keys);
};

test("segmented: one group, date then time, focus crosses the boundary", () => {
  const changes: unknown[] = [];
  const c = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    onValueChange: (v) => changes.push(fmt(v)),
  });
  const parts = c
    .getState()
    .segments.filter((s) => s.type !== "literal")
    .map((s) => s.type);
  assert.deepEqual(parts, ["month", "day", "year", "hour", "minute"]);
  type(c, "11172026");
  assert.equal(c.getState().focusedPart, "hour");
  type(c, "0930");
  assert.equal(fmt(c.getState().value), "2026-11-17 09:30");
  assert.equal(changes.at(-1), "2026-11-17 09:30"); // minute 3 is a valid intermediate value
  assert.equal(c.getState().validity, "valid");
  assert.equal(c.getState().zoneLabel, null);
  const stops = c
    .getState()
    .segments.filter((s) => s.type !== "literal")
    .map((s) => c.getSegmentAttributes(s).tabindex);
  assert.equal(stops.filter((t) => t === 0).length, 1);
});

test("arrow keys move across the date/time boundary", () => {
  const c = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    defaultValue: plainDateTime(plainDate(2026, 11, 17), plainTime(9, 30)),
  });
  c.handleKeyDown("year", "ArrowRight", keys);
  assert.equal(c.getState().focusedPart, "hour");
  c.handleKeyDown("hour", "ArrowLeft", keys);
  assert.equal(c.getState().focusedPart, "year");
});

test("zoned values: display zone, value zone, adjusted gap, reject", () => {
  const zoned = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    timeZone: "America/New_York",
    valueTimeZone: "UTC",
  });
  type(zoned, "03082026");
  type(zoned, "0230");
  const value = zoned.getState().value as {
    hour: number;
    minute: number;
    timeZone: string;
  };
  assert.equal(value.timeZone, "UTC");
  assert.equal(`${value.hour}:${value.minute}`, "7:30"); // 03:30 EDT
  assert.equal(zoned.getState().adjusted, true);
  assert.equal(zoned.getState().dateField.value?.day, 8);
  assert.equal(zoned.getState().timeField.value?.hour, 2); // the typed wall time stays on screen
  assert.equal(zoned.getRootAttributes()["data-adjusted"], true);
  assert.ok(zoned.getState().zoneLabel);
  const reject = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    timeZone: "America/New_York",
    disambiguation: "reject",
  });
  type(reject, "03082026");
  type(reject, "0230");
  assert.equal(reject.getState().value, null);
  assert.equal(reject.getState().validity, "nonexistent-time");
  const plain = createDateTimeInputController({ ...base, hourCycle: "h23" });
  type(plain, "031120260230");
  assert.equal("timeZone" in (plain.getState().value ?? {}), false);
});

test("constraints: min on the boundary day, disablePast, before-min", () => {
  const c = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    timeZone: "UTC",
    min: "2026-11-17T14:30",
  });
  type(c, "11172026");
  type(c, "1400");
  assert.equal(c.getState().value, null);
  assert.equal(c.getState().timeField.validity, "before-min");
  assert.equal(c.getState().validity, "before-min");
  const past = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    timeZone: "UTC",
    disablePast: true,
  });
  type(past, "11162026");
  assert.equal(past.getState().dateField.validity, "before-min");
});

test("text mode: two fields, each parses alone, paste fills both", () => {
  const c = createDateTimeInputController({
    ...base,
    mode: "text",
    hourCycle: "h23",
    name: "when",
  });
  c.getDate().setText("17 Nov 2026");
  c.getDate().commitText();
  assert.equal(c.getState().value, null);
  assert.equal(c.getState().validity, "incomplete");
  c.getTime().setText("9:30");
  c.getTime().commitText();
  assert.equal(fmt(c.getState().value), "2026-11-17 09:30");
  assert.deepEqual(c.getState().hidden, [
    { name: "when", value: "2026-11-17T09:30" },
  ]);
  assert.equal(c.getDateFieldAttributes()["aria-label"], "Date");
  assert.equal(c.getTimeFieldAttributes()["aria-label"], "Time");
  assert.equal(c.paste("12/25/2026 6:15 PM"), true);
  assert.equal(fmt(c.getState().value), "2026-12-25 18:15");
  assert.equal(c.paste("9:45"), true);
  assert.equal(fmt(c.getState().value), "2026-12-25 09:45");
  assert.equal(c.paste("nonsense"), false);
});

test("forms: offset in the hidden value, formValue override, clear and reset", () => {
  const c = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    timeZone: "Asia/Ho_Chi_Minh",
    name: "at",
    defaultValue: resolveWall(
      plainDateTime(plainDate(2026, 11, 17), plainTime(9, 30)),
      "Asia/Ho_Chi_Minh",
    ).zoned,
  });
  assert.deepEqual(c.getState().hidden, [
    { name: "at", value: "2026-11-17T09:30+07:00" },
  ]);
  c.setOptions({ formValue: (v) => `${toInstant(v as never)}` });
  assert.match(c.getState().hidden[0]?.value ?? "", /^\d+$/);
  c.clear();
  assert.equal(c.getState().value, null);
  assert.equal(c.getState().validity, "empty");
  c.reset();
  assert.equal(fmt(c.getState().value), "2026-11-17 09:30");
});

test("controlled values and commit", () => {
  const commits: unknown[] = [];
  const c = createDateTimeInputController({
    ...base,
    hourCycle: "h23",
    value: null,
    onValueCommit: (v) => commits.push(fmt(v)),
  });
  type(c, "111720260930");
  assert.equal(c.getState().value, null);
  c.setOptions({
    value: plainDateTime(plainDate(2026, 3, 9), plainTime(11, 5)),
  });
  assert.equal(c.getState().dateField.value?.month, 3);
  assert.equal(c.getState().timeField.value?.hour, 11);
  c.commit();
  assert.deepEqual(commits, ["2026-03-09 11:05"]);
});

test("range input: validity across days, durations, names", () => {
  const commits: unknown[] = [];
  const r = createDateTimeRangeInputController({
    ...base,
    hourCycle: "h23",
    timeZone: "UTC",
    name: "stay",
    minDuration: 60,
    onValueCommit: (v) => commits.push(`${fmt(v.start)}..${fmt(v.end)}`),
  });
  const s = r.getStart();
  const e = r.getEnd();
  const typeInto = (c: C, text: string) => {
    for (const ch of text) c.handleKeyDown(c.getState().focusedPart, ch, keys);
  };
  typeInto(s, "111720261400");
  assert.equal(r.getState().validity, "incomplete");
  typeInto(e, "111720261430");
  assert.equal(r.getState().validity, "too-short");
  e.clear();
  typeInto(e, "111820261000");
  assert.equal(r.getState().validity, "valid");
  assert.equal(r.getState().duration, 20 * 60);
  r.commit();
  assert.deepEqual(commits, ["2026-11-17 14:00..2026-11-18 10:00"]);
  assert.equal(r.getState().hidden.length, 2);
  assert.equal(r.getState().hidden[0]?.name, "stay-start");
  e.clear();
  typeInto(e, "111720261000");
  assert.equal(r.getState().validity, "end-before-start");
});

test("single panel: partial state, defaultTime, commit rule (plan 08 §13.2 table)", () => {
  const changes: unknown[] = [];
  const commits: unknown[] = [];
  const p = createDateTimePanelController({
    ...base,
    onValueChange: (v, info) => changes.push([fmt(v), info.adjusted]),
    onValueCommit: (v) => commits.push(fmt(v)),
    time: { hourCycle: "h23", granularity: "minute" },
  });
  p.getDate().pick(plainDate(2026, 11, 20), "pointer");
  assert.deepEqual(changes, []);
  assert.equal(p.getState().value, null);
  assert.equal(p.getState().draft.date?.day, 20);
  p.getTime().pick("hour:9", "pointer");
  p.getTime().pick("minute:30", "pointer");
  assert.deepEqual(changes, [["2026-11-20 09:30", false]]);
  assert.deepEqual(commits, ["2026-11-20 09:30"]);
  p.getDate().pick(plainDate(2026, 11, 22), "pointer");
  assert.equal(fmt(p.getState().value as never), "2026-11-22 09:30");
  assert.deepEqual(commits, ["2026-11-20 09:30"]);
  p.clear();
  assert.equal(p.getState().value, null);
  assert.equal(p.getState().draft.date, null);
});

test("single panel: defaultTime completes the value at once; constraints", () => {
  const changes: unknown[] = [];
  const commits: unknown[] = [];
  const p = createDateTimePanelController({
    ...base,
    defaultTime: "09:00",
    timeZone: "UTC",
    min: "2026-11-17T14:30",
    time: { hourCycle: "h23" },
    onValueChange: (v) => changes.push(fmt(v)),
    onValueCommit: (v) => commits.push(fmt(v)),
  });
  assert.equal(p.getDate().getState().cells.length, 0);
  p.getDate().pick(plainDate(2026, 11, 18), "pointer");
  assert.deepEqual(changes, ["2026-11-18 09:00"]);
  assert.deepEqual(commits, []);
  p.getDate().pick(plainDate(2026, 11, 17), "pointer"); // 09:00 is before 14:30 on the boundary day
  assert.equal(p.getState().value, null);
  assert.equal(p.getState().draft.time?.hour, 9);
  const hours = p.getState().time.sets[0]?.columns[0]?.options ?? [];
  assert.equal(hours.find((o) => o.key === "hour:9")?.disabled, true);
  assert.equal(hours.find((o) => o.key === "hour:15")?.disabled, false);
  const days = p.getState().date.months[0]?.weeks.flatMap((w) => w.days) ?? [];
  assert.equal(days.find((d) => d.key === "2026-11-16")?.disabled, true);
});

test("single panel: zoned value, adjusted flag, controlled value", () => {
  const p = createDateTimePanelController({
    ...base,
    timeZone: "America/New_York",
    valueTimeZone: "UTC",
    defaultTime: "02:30",
    time: { hourCycle: "h23" },
  });
  p.getDate().pick(plainDate(2026, 3, 8), "pointer");
  assert.equal(p.getState().adjusted, true);
  assert.equal((p.getState().value as { timeZone: string }).timeZone, "UTC");
  assert.equal(p.getRootAttributes()["data-adjusted"], true);
  const c = createDateTimePanelController({
    ...base,
    value: null,
    time: { hourCycle: "h23" },
  });
  c.getDate().pick(plainDate(2026, 11, 20), "pointer");
  c.setOptions({
    value: plainDateTime(plainDate(2027, 1, 5), plainTime(8, 15)),
  });
  assert.equal(c.getState().draft.date?.year, 2027);
  assert.equal(c.getState().draft.time?.minute, 15);
});

test("range panel: two dates, two times, commit on the end time, invalid ends disabled", () => {
  const commits: unknown[] = [];
  const p = createDateTimeRangePanelController({
    ...base,
    timeZone: "UTC",
    minDuration: 60,
    date: { months: 1 },
    startTime: { hourCycle: "h23" },
    endTime: { hourCycle: "h23" },
    onValueCommit: (v) => commits.push(`${fmt(v.start)}..${fmt(v.end)}`),
  });
  p.getDate().pick(plainDate(2026, 11, 20), "pointer");
  p.getDate().pick(plainDate(2026, 11, 20), "pointer");
  assert.equal(p.getState().draft.range?.end?.day, 20);
  p.getStartTime().pick("hour:14", "pointer");
  p.getStartTime().pick("minute:0", "pointer");
  const endHours = p.getState().endTime.sets[0]?.columns[0]?.options ?? [];
  assert.equal(endHours.find((o) => o.key === "hour:13")?.disabled, true);
  assert.equal(endHours.find((o) => o.key === "hour:15")?.disabled, false);
  p.getEndTime().pick("hour:15", "pointer");
  assert.deepEqual(commits, []);
  p.getEndTime().pick("minute:30", "pointer");
  assert.deepEqual(commits, ["2026-11-20 14:00..2026-11-20 15:30"]);
  assert.equal(p.getState().validity, "valid");
  assert.equal(p.getState().duration, 90);
  assert.equal(p.getRootAttributes()["data-chrono-datetime-panel"], "range");
  p.clear();
  assert.equal(p.getState().value, null);
});
