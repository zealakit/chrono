import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutAllDayRow, normalizeEvents } from "../dist/calendar/index.js";
import { plainDate, toPlainDate } from "../dist/foundation/index.js";

const days = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
].map((key) => ({ date: toPlainDate(key), key }));
const range = { start: plainDate(2026, 11, 16), end: plainDate(2026, 11, 22) };

function run(
  events: { id: string; start: string; end: string; allDay?: boolean }[],
  options = {},
) {
  return layoutAllDayRow(
    normalizeEvents(events, { visibleRange: range }),
    days,
    options,
  );
}

function laneOf(
  segments: { event: { id: string }; lane: number }[],
  id: string,
) {
  const segment = segments.find((s) => s.event.id === id);
  assert.ok(segment, `missing ${id}`);
  return segment.lane;
}

test("packs all-day events into lanes with first-fit", () => {
  const { segments } = run([
    { id: "A", start: "2026-11-16", end: "2026-11-19", allDay: true },
    { id: "C", start: "2026-11-17", end: "2026-11-18", allDay: true },
    { id: "D", start: "2026-11-18", end: "2026-11-23", allDay: true },
  ]);
  assert.equal(laneOf(segments, "A"), 0);
  assert.equal(laneOf(segments, "C"), 1);
  assert.equal(laneOf(segments, "D"), 1);
});

test("long timed events join the all-day row (E5)", () => {
  const { segments } = run([
    { id: "A", start: "2026-11-16", end: "2026-11-19", allDay: true },
    { id: "L", start: "2026-11-16T09:00", end: "2026-11-18T09:00" },
  ]);
  const l = segments.find((s) => s.event.id === "L");
  assert.ok(l);
  assert.equal(l.startColumn, 0);
  assert.equal(l.days, 3);
  assert.equal(l.allDay, false);
  assert.equal(laneOf(segments, "A"), 0);
  assert.equal(l.lane, 1); // all-day sorts before the long timed event
});

test("timed events under 24h stay out of the all-day row", () => {
  const { segments } = run([
    { id: "T", start: "2026-11-16T09:00", end: "2026-11-16T10:00" },
  ]);
  assert.equal(segments.length, 0);
});

test("overflow hides lanes beyond the all-day limit", () => {
  const { segments, more } = run(
    [
      { id: "A", start: "2026-11-17", end: "2026-11-18", allDay: true },
      { id: "B", start: "2026-11-17", end: "2026-11-18", allDay: true },
      { id: "C", start: "2026-11-17", end: "2026-11-18", allDay: true },
    ],
    { eventLimit: 2 },
  );
  const hidden = (id: string) =>
    segments.find((s) => s.event.id === id)?.hidden;
  assert.equal(hidden("A"), false);
  assert.equal(hidden("B"), true);
  assert.equal(hidden("C"), true);
  assert.equal(more.length, 1);
  assert.equal(more[0]?.dayKey, "2026-11-17");
  assert.equal(more[0]?.count, 2);
});
