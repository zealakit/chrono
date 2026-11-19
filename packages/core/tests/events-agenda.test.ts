import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutAgenda, normalizeEvents } from "../dist/calendar/index.js";
import { plainDate, toPlainDate } from "../dist/foundation/index.js";

const days = ["2026-11-16", "2026-11-17", "2026-11-18"].map((key) => ({
  date: toPlainDate(key),
  key,
}));
const range = { start: plainDate(2026, 11, 16), end: plainDate(2026, 11, 18) };

function run(
  events: { id: string; start: string; end: string; allDay?: boolean }[],
  options = {},
) {
  return layoutAgenda(
    normalizeEvents(events, { visibleRange: range }),
    days,
    options,
  );
}

test("groups events by day", () => {
  const result = run([
    { id: "A", start: "2026-11-16T09:00", end: "2026-11-16T10:00" },
    { id: "B", start: "2026-11-18T14:00", end: "2026-11-18T15:00" },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0]?.dayKey, "2026-11-16");
  assert.equal(result[1]?.dayKey, "2026-11-18");
});

test("a multi-day event appears in every day with continuation flags", () => {
  const result = run([
    { id: "A", start: "2026-11-16", end: "2026-11-19", allDay: true },
  ]);
  assert.equal(result.length, 3);
  const items = result.flatMap((day) => day.items);
  assert.equal(items.length, 3);
  const d16 = items.find((i) => i.dayKey === "2026-11-16");
  const d17 = items.find((i) => i.dayKey === "2026-11-17");
  const d18 = items.find((i) => i.dayKey === "2026-11-18");
  assert.equal(d16?.continuesBefore, false);
  assert.equal(d16?.continuesAfter, true);
  assert.equal(d17?.continuesBefore, true);
  assert.equal(d17?.continuesAfter, true);
  assert.equal(d18?.continuesBefore, true);
  assert.equal(d18?.continuesAfter, false);
});

test("showEmptyDays includes days with no events", () => {
  const without = run([
    { id: "A", start: "2026-11-16T09:00", end: "2026-11-16T10:00" },
  ]);
  assert.equal(without.length, 1);
  const withEmpty = run(
    [{ id: "A", start: "2026-11-16T09:00", end: "2026-11-16T10:00" }],
    { showEmptyDays: true },
  );
  assert.equal(withEmpty.length, 3);
  assert.deepEqual(
    withEmpty.map((d) => d.dayKey),
    ["2026-11-16", "2026-11-17", "2026-11-18"],
  );
});

test("all-day events sort before timed events within a day", () => {
  const result = run([
    { id: "timed", start: "2026-11-16T09:00", end: "2026-11-16T10:00" },
    { id: "allDay", start: "2026-11-16", end: "2026-11-17", allDay: true },
  ]);
  const items = result[0]?.items ?? [];
  assert.deepEqual(
    items.map((i) => i.event.id),
    ["allDay", "timed"],
  );
});
