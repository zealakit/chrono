import assert from "node:assert/strict";
import { test } from "node:test";
import {
  backspace,
  emptySegment,
  stepSegment,
  typeDigit,
} from "../dist/foundation/index.js";
import {
  createDateInputController,
  createDateRangeInputController,
} from "../dist/date/index.js";
import { plainDate } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base = { locale: "en-US", timeZone: "UTC", now: NOW };
const keys = { shift: false, ctrl: false, meta: false };
const iso = (
  x: { year: number; month: number; day: number } | null | undefined,
) =>
  x
    ? `${x.year}-${String(x.month).padStart(2, "0")}-${String(x.day).padStart(2, "0")}`
    : null;

function type(c: ReturnType<typeof createDateInputController>, text: string) {
  for (const ch of text) {
    const part = c.getState().focusedPart;
    c.handleKeyDown(part, ch, keys);
  }
}
const seg = (c: ReturnType<typeof createDateInputController>, type: string) =>
  c.getState().segments.find((s) => s.type === type)!;

test("engine: month typing and auto-advance rules", () => {
  const month = { min: 1, max: 12, maxDigits: 2, pageStep: 3 };
  let r = typeDigit(month, emptySegment, 1);
  assert.deepEqual([r.segment.value, r.advance], [1, false]);
  r = typeDigit(month, r.segment, 2);
  assert.deepEqual([r.segment.value, r.advance], [12, true]);
  r = typeDigit(month, emptySegment, 4);
  assert.deepEqual([r.segment.value, r.advance], [4, true]);
  r = typeDigit(month, emptySegment, 0);
  assert.deepEqual([r.segment.value, r.advance], [null, false]);
  r = typeDigit(month, r.segment, 5);
  assert.deepEqual([r.segment.value, r.advance], [5, true]);
  r = typeDigit(month, typeDigit(month, emptySegment, 1).segment, 3);
  assert.deepEqual([r.segment.value, r.segment.buffer], [3, "3"]);
});

test("engine: step wraps and starts from the placeholder; backspace", () => {
  const month = { min: 1, max: 12, maxDigits: 2, pageStep: 3 };
  assert.equal(stepSegment(month, emptySegment, 1, 11).value, 11);
  assert.equal(stepSegment(month, { value: 12, buffer: "" }, 1, 11).value, 1);
  assert.equal(stepSegment(month, { value: 1, buffer: "" }, -1, 11).value, 12);
  assert.equal(stepSegment(month, { value: 2, buffer: "" }, 3, 11).value, 5);
  assert.equal(backspace({ value: 12, buffer: "12" }).buffer, "1");
  assert.equal(backspace({ value: 1, buffer: "1" }).value, null);
});

test("typing a full date in en-US fills and advances", () => {
  const changes: unknown[] = [];
  const c = createDateInputController({
    ...base,
    onValueChange: (v) => changes.push(iso(v)),
  });
  type(c, "11172026");
  assert.equal(iso(c.getState().value), "2026-11-17");
  assert.equal(c.getState().validity, "valid");
  assert.deepEqual(changes, ["2026-11-17"]);
  assert.equal(c.getState().hidden.length, 0);
});

test("en-GB and zh-CN part order", () => {
  const gb = createDateInputController({ ...base, locale: "en-GB" });
  assert.equal(gb.getState().focusedPart, "day");
  type(gb, "17112026");
  assert.equal(iso(gb.getState().value), "2026-11-17");
  const zh = createDateInputController({ ...base, locale: "zh-CN" });
  assert.equal(zh.getState().focusedPart, "year");
  type(zh, "20261117");
  assert.equal(iso(zh.getState().value), "2026-11-17");
});

test("invalid dates keep what was typed; validity states", () => {
  const c = createDateInputController({
    ...base,
    min: "2026-01-01",
    max: "2026-12-31",
  });
  assert.equal(c.getState().validity, "empty");
  type(c, "02");
  assert.equal(c.getState().validity, "incomplete");
  // The day limit follows the month once it is known: `3` cannot take a second digit in February.
  type(c, "3");
  assert.equal(seg(c, "day").value, 3);
  assert.equal(c.getState().focusedPart, "year");
  c.clear();
  type(c, "02292026");
  assert.equal(c.getState().value, null);
  assert.equal(c.getState().validity, "invalid-date");
  assert.equal(c.getRootAttributes()["data-invalid"], true);
  assert.equal(seg(c, "day").value, 29);
  c.clear();
  type(c, "01012025");
  assert.equal(c.getState().validity, "before-min");
  c.clear();
  type(c, "01012027");
  assert.equal(c.getState().validity, "after-max");
  const disabled = createDateInputController({
    ...base,
    isDateDisabled: (x) => x.day === 1,
    defaultValue: plainDate(2026, 5, 1),
  });
  assert.equal(disabled.getState().validity, "disabled");
  const unavailable = createDateInputController({
    ...base,
    isDateUnavailable: (x) => x.day === 1,
    defaultValue: plainDate(2026, 5, 1),
  });
  assert.equal(unavailable.getState().validity, "unavailable");
});

test("two-digit and short years settle on blur", () => {
  const c = createDateInputController({ ...base });
  type(c, "1117");
  assert.equal(c.getState().focusedPart, "year");
  type(c, "26");
  assert.equal(c.getState().value, null);
  c.settle();
  assert.equal(iso(c.getState().value), "2026-11-17");
});

test("arrow keys step with wrap, start from the placeholder, clamp the day", () => {
  const c = createDateInputController({ ...base });
  c.handleKeyDown("month", "ArrowUp", keys);
  assert.equal(seg(c, "month").value, 11);
  c.handleKeyDown("month", "ArrowUp", keys);
  c.handleKeyDown("month", "ArrowUp", keys);
  assert.equal(seg(c, "month").value, 1);
  c.handleKeyDown("month", "Home", keys);
  assert.equal(seg(c, "month").value, 1);
  c.handleKeyDown("month", "End", keys);
  assert.equal(seg(c, "month").value, 12);
  c.handleKeyDown("month", "Backspace", keys);
  assert.equal(seg(c, "month").value, null);
  const clamp = createDateInputController({
    ...base,
    defaultValue: plainDate(2026, 1, 31),
  });
  clamp.handleKeyDown("month", "ArrowUp", keys);
  assert.equal(iso(clamp.getState().value), "2026-02-28");
});

test("left/right move between parts, swapped in RTL", () => {
  const c = createDateInputController(base);
  c.handleKeyDown("month", "ArrowRight", keys);
  assert.equal(c.getState().focusedPart, "day");
  const rtl = createDateInputController({ ...base, locale: "ar-EG" });
  const first = rtl.getState().focusedPart;
  rtl.handleKeyDown(first, "ArrowLeft", keys);
  assert.notEqual(rtl.getState().focusedPart, first);
});

test("segment attributes: one tab stop, spinbutton, no handlers", () => {
  const c = createDateInputController({ ...base, required: true });
  const attrs = c
    .getState()
    .segments.filter((s) => s.type !== "literal")
    .map((s) => c.getSegmentAttributes(s));
  assert.equal(attrs.filter((a) => a.tabindex === 0).length, 1);
  assert.ok(
    attrs.every(
      (a) => a.role === "spinbutton" && a["aria-required"] === "true",
    ),
  );
  assert.equal(attrs[0]?.["data-placeholder"], true);
  const literal = c.getState().segments.find((s) => s.type === "literal")!;
  assert.equal(c.getSegmentAttributes(literal)["aria-hidden"], "true");
});

test("locale digits are accepted and displayed", () => {
  const c = createDateInputController({ ...base, locale: "ar-EG" });
  for (const ch of "١٧١١٢٠٢٦")
    c.handleKeyDown(c.getState().focusedPart, ch, keys);
  assert.equal(iso(c.getState().value), "2026-11-17");
  assert.ok(/[٠-٩]/.test(seg(c, "year").text));
});

test("paste fills every part; unparseable paste reports", () => {
  const bad: string[] = [];
  const c = createDateInputController({
    ...base,
    onInvalidInput: (t) => bad.push(t),
  });
  assert.equal(c.paste("Nov 17 2026"), true);
  assert.equal(iso(c.getState().value), "2026-11-17");
  assert.equal(c.paste("nonsense"), false);
  assert.deepEqual(bad, ["nonsense"]);
});

test("commit fires once for a valid value", () => {
  const commits: unknown[] = [];
  const c = createDateInputController({
    ...base,
    onValueCommit: (v) => commits.push(iso(v)),
  });
  type(c, "11172026");
  c.commit();
  c.commit();
  assert.deepEqual(commits, ["2026-11-17"]);
});

test("controlled: an outside value resets the parts, null stays controlled", () => {
  const c = createDateInputController({ ...base, value: null });
  type(c, "11172026");
  assert.equal(c.getState().value, null);
  c.setOptions({ value: plainDate(2026, 3, 9) });
  assert.equal(seg(c, "month").value, 3);
  c.setOptions({ value: null });
  assert.equal(seg(c, "month").value, null);
  const partial = createDateInputController({ ...base, value: null });
  type(partial, "11");
  partial.setOptions({ value: null });
  assert.equal(seg(partial, "month").value, 11);
});

test("text mode: parse on blur/Enter, reformat, keep invalid text", () => {
  const bad: string[] = [];
  const c = createDateInputController({
    ...base,
    mode: "text",
    onInvalidInput: (t) => bad.push(t),
  });
  c.setText("Nov 17 2026");
  assert.equal(c.getState().value, null);
  c.commitText();
  assert.equal(iso(c.getState().value), "2026-11-17");
  assert.equal(c.getState().text, "11/17/2026");
  c.setText("hello");
  assert.equal(c.commitText(), false);
  assert.equal(c.getState().text, "hello");
  assert.equal(c.getState().validity, "invalid-date");
  assert.deepEqual(bad, ["hello"]);
  assert.equal(c.handleTextKeyDown("Escape"), true);
  assert.equal(c.getState().text, "11/17/2026");
  assert.equal(c.getState().pattern, "mm/dd/yyyy");
  c.setText("");
  c.commitText();
  assert.equal(c.getState().value, null);
});

test("custom parse and format replace the built-ins", () => {
  const c = createDateInputController({
    ...base,
    mode: "text",
    parse: (text) => (text === "xmas" ? plainDate(2026, 12, 25) : null),
    format: () => "Christmas",
  });
  c.setText("xmas");
  c.commitText();
  assert.equal(c.getState().text, "Christmas");
});

test("forms: hidden value, clear and reset", () => {
  const c = createDateInputController({
    ...base,
    name: "when",
    defaultValue: plainDate(2026, 5, 1),
  });
  assert.deepEqual(c.getState().hidden, [
    { name: "when", value: "2026-05-01" },
  ]);
  c.clear();
  assert.deepEqual(c.getState().hidden, [{ name: "when", value: "" }]);
  c.reset();
  assert.equal(iso(c.getState().value), "2026-05-01");
});

test("readOnly and disabled", () => {
  const ro = createDateInputController({ ...base, readOnly: true });
  assert.equal(ro.handleKeyDown("month", "1", keys), false);
  const off = createDateInputController({ ...base, disabled: true });
  assert.equal(off.getRootAttributes()["aria-disabled"], "true");
  assert.equal(
    off.getSegmentAttributes(off.getState().segments[0]!).tabindex,
    undefined,
  );
});

test("range input: two fields, shared validity, names", () => {
  const changes: unknown[] = [];
  const commits: unknown[] = [];
  const r = createDateRangeInputController({
    ...base,
    name: "stay",
    minDays: 2,
    onValueChange: (v) =>
      changes.push(v ? `${iso(v.start)}..${iso(v.end)}` : null),
    onValueCommit: (v) => commits.push(`${iso(v.start)}..${iso(v.end)}`),
  });
  const s = r.getStart();
  const e = r.getEnd();
  for (const ch of "11102026")
    s.handleKeyDown(s.getState().focusedPart, ch, keys);
  assert.equal(r.getState().validity, "incomplete");
  for (const ch of "11102026")
    e.handleKeyDown(e.getState().focusedPart, ch, keys);
  assert.equal(r.getState().validity, "too-short");
  e.clear();
  for (const ch of "11122026")
    e.handleKeyDown(e.getState().focusedPart, ch, keys);
  assert.equal(r.getState().validity, "valid");
  r.commit();
  assert.deepEqual(commits, ["2026-11-10..2026-11-12"]);
  assert.deepEqual(r.getState().hidden, [
    { name: "stay-start", value: "2026-11-10" },
    { name: "stay-end", value: "2026-11-12" },
  ]);
  assert.equal(changes.at(-1), "2026-11-10..2026-11-12");
  e.clear();
  for (const ch of "11052026")
    e.handleKeyDown(e.getState().focusedPart, ch, keys);
  assert.equal(r.getState().validity, "end-before-start");
  assert.equal(r.getRootAttributes()["data-chrono-date-range-input"], true);
});

test("range input: controlled value flows into both fields", () => {
  const r = createDateRangeInputController({ ...base, value: null });
  r.setOptions({
    value: { start: plainDate(2026, 6, 1), end: plainDate(2026, 6, 9) },
  });
  assert.equal(iso(r.getStart().getState().value), "2026-06-01");
  assert.equal(iso(r.getEnd().getState().value), "2026-06-09");
  assert.equal(r.getState().validity, "valid");
});
