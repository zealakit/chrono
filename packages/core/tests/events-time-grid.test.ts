import assert from "node:assert/strict";
import { test } from "node:test";
import {
  layoutTimeGridEvents,
  normalizeEvents,
  type CalendarEventInput,
  type TimeGridEventsOptions,
  type TimeGridSegment,
} from "../dist/calendar/index.js";
import { plainDate, plainTime } from "../dist/foundation/index.js";

const DAY = { date: plainDate(2026, 11, 17), key: "2026-11-17" };
const range = { start: plainDate(2026, 11, 17), end: plainDate(2026, 11, 17) };

function run(
  events: CalendarEventInput[],
  days = [DAY],
  options: TimeGridEventsOptions = {},
): TimeGridSegment[] {
  return layoutTimeGridEvents(
    normalizeEvents(events, { visibleRange: range }),
    days,
    options,
  );
}

function byId(segments: TimeGridSegment[]) {
  const map = new Map<string, TimeGridSegment>();
  for (const segment of segments) {
    map.set(String(segment.event.id), segment);
  }
  return (id: string): TimeGridSegment => {
    const segment = map.get(id);
    assert.ok(segment, `missing segment ${id}`);
    return segment;
  };
}

test("clusters overlapping events into columns (worked example 13.3)", () => {
  const pick = byId(
    run([
      { id: "A", start: "2026-11-17T09:00", end: "2026-11-17T10:00" },
      { id: "B", start: "2026-11-17T09:30", end: "2026-11-17T10:30" },
      { id: "C", start: "2026-11-17T10:00", end: "2026-11-17T11:00" },
      { id: "D", start: "2026-11-17T12:00", end: "2026-11-17T13:00" },
    ]),
  );
  assert.equal(pick("A").column, 0);
  assert.equal(pick("A").columns, 2);
  assert.equal(pick("A").span, 1);
  assert.equal(pick("B").column, 1);
  assert.equal(pick("C").column, 0);
  assert.equal(pick("D").column, 0);
  assert.equal(pick("D").columns, 1);
  assert.equal(pick("D").span, 1);
  assert.equal(pick("A").top, 9 / 24);
  assert.ok(Math.abs(pick("A").height - 1 / 24) < 1e-12);
});

test("reuses a free column and expands only where free (13.3)", () => {
  const pick = byId(
    run([
      { id: "A", start: "2026-11-17T09:00", end: "2026-11-17T12:00" },
      { id: "E", start: "2026-11-17T09:00", end: "2026-11-17T09:30" },
      { id: "B", start: "2026-11-17T09:30", end: "2026-11-17T10:00" },
      { id: "C", start: "2026-11-17T10:30", end: "2026-11-17T11:00" },
    ]),
  );
  assert.equal(pick("A").column, 0);
  assert.equal(pick("E").column, 1);
  assert.equal(pick("B").column, 1);
  assert.equal(pick("C").column, 1);
  for (const id of ["A", "E", "B", "C"]) {
    assert.equal(pick(id).columns, 2);
    assert.equal(pick(id).span, 1);
  }
});

test("a short event draws minEventDuration height but keeps its real end", () => {
  const [segment] = run([
    { id: "A", start: "2026-11-17T14:00", end: "2026-11-17T14:05" },
  ]);
  assert.ok(segment);
  assert.ok(Math.abs(segment.height - 15 / 1440) < 1e-12);
});

test("timed events crossing midnight split per day with continuation flags", () => {
  const days = [
    { date: plainDate(2026, 11, 16), key: "2026-11-16" },
    { date: plainDate(2026, 11, 17), key: "2026-11-17" },
  ];
  const segments = layoutTimeGridEvents(
    normalizeEvents(
      [{ id: "A", start: "2026-11-16T22:00", end: "2026-11-17T02:00" }],
      {
        visibleRange: {
          start: plainDate(2026, 11, 16),
          end: plainDate(2026, 11, 17),
        },
      },
    ),
    days,
  );
  assert.equal(segments.length, 2);
  const d16 = segments.find((s) => s.dayKey === "2026-11-16");
  const d17 = segments.find((s) => s.dayKey === "2026-11-17");
  assert.ok(d16);
  assert.ok(d17);
  assert.equal(d16.continuesAfter, true);
  assert.equal(d17.continuesBefore, true);
  assert.equal(d16.top, 22 / 24);
  assert.ok(Math.abs(d16.height - 2 / 24) < 1e-12);
  assert.equal(d17.top, 0);
  assert.ok(Math.abs(d17.height - 2 / 24) < 1e-12);
});

test("events of 24 hours or more are excluded from the timed area (E5)", () => {
  const segments = run([
    { id: "A", start: "2026-11-16T09:00", end: "2026-11-17T09:00" },
  ]);
  assert.equal(segments.length, 0);
});

test("events are clipped to the dayStart/dayEnd axis", () => {
  const [segment] = run(
    [{ id: "A", start: "2026-11-17T08:00", end: "2026-11-17T18:00" }],
    [DAY],
    { dayStart: plainTime(9, 0), dayEnd: plainTime(17, 0) },
  );
  assert.ok(segment);
  assert.equal(segment.top, 0);
  assert.ok(Math.abs(segment.height - 1) < 1e-12);
});
