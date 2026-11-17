import assert from "node:assert/strict";
import { test } from "node:test";
import { computeSelection, selectionPieces } from "../dist/calendar/index.js";
import { plainDate, plainTime, toIsoString } from "../dist/foundation/index.js";

test("all-day selection spans whole days with an exclusive end", () => {
  const range = computeSelection(
    { date: plainDate(2026, 11, 17) },
    { date: plainDate(2026, 11, 19) },
    { allDay: true },
  );
  assert.equal(range.allDay, true);
  assert.equal(toIsoString(range.start), "2026-11-17T00:00:00");
  assert.equal(toIsoString(range.end), "2026-11-20T00:00:00");
});

test("dragging backwards swaps the all-day selection", () => {
  const range = computeSelection(
    { date: plainDate(2026, 11, 19) },
    { date: plainDate(2026, 11, 17) },
    { allDay: true },
  );
  assert.equal(toIsoString(range.start), "2026-11-17T00:00:00");
  assert.equal(toIsoString(range.end), "2026-11-20T00:00:00");
});

test("timed selection snaps to the slot and is half-open", () => {
  const range = computeSelection(
    { date: plainDate(2026, 11, 17), time: plainTime(9, 7) },
    { date: plainDate(2026, 11, 17), time: plainTime(10, 12) },
    { slotDurationMinutes: 30 },
  );
  assert.equal(toIsoString(range.start), "2026-11-17T09:00:00");
  assert.equal(toIsoString(range.end), "2026-11-17T10:30:00");
});

test("a single-slot selection is one slot long", () => {
  const range = computeSelection(
    { date: plainDate(2026, 11, 17), time: plainTime(9, 0) },
    { date: plainDate(2026, 11, 17), time: plainTime(9, 0) },
    { slotDurationMinutes: 30 },
  );
  assert.equal(toIsoString(range.start), "2026-11-17T09:00:00");
  assert.equal(toIsoString(range.end), "2026-11-17T09:30:00");
});

test("a timed selection spans days and swaps when dragged backwards", () => {
  const range = computeSelection(
    { date: plainDate(2026, 11, 17), time: plainTime(22, 0) },
    { date: plainDate(2026, 11, 18), time: plainTime(2, 0) },
    { slotDurationMinutes: 60 },
  );
  assert.equal(toIsoString(range.start), "2026-11-17T22:00:00");
  assert.equal(toIsoString(range.end), "2026-11-18T03:00:00");
});

test("maxDurationMinutes clamps the end", () => {
  const range = computeSelection(
    { date: plainDate(2026, 11, 17), time: plainTime(9, 0) },
    { date: plainDate(2026, 11, 17), time: plainTime(14, 0) },
    { slotDurationMinutes: 60, maxDurationMinutes: 120 },
  );
  assert.equal(toIsoString(range.start), "2026-11-17T09:00:00");
  assert.equal(toIsoString(range.end), "2026-11-17T11:00:00");
});

test("selectionPieces splits a range per day", () => {
  const range = computeSelection(
    { date: plainDate(2026, 11, 17), time: plainTime(22, 0) },
    { date: plainDate(2026, 11, 18), time: plainTime(2, 0) },
    { slotDurationMinutes: 60 },
  );
  const pieces = selectionPieces(range);
  assert.equal(pieces.length, 2);
  assert.equal(toIsoString(pieces[0]?.start as never), "2026-11-17T22:00:00");
  assert.equal(pieces[0]?.continuesAfter, true);
  assert.equal(toIsoString(pieces[1]?.end as never), "2026-11-18T03:00:00");
  assert.equal(pieces[1]?.continuesBefore, true);
});
