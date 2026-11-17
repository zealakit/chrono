import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeEvents } from "../dist/calendar/index.js";
import {
  fromInclusiveEndDate,
  plainDate,
  toIsoString,
  toPlainDateTime,
} from "../dist/foundation/index.js";

const NOV = { start: plainDate(2026, 11, 1), end: plainDate(2026, 11, 30) };

test("timed events parse ISO and keep half-open values", () => {
  const [event] = normalizeEvents(
    [{ id: "a", start: "2026-11-17T09:00", end: "2026-11-17T10:30" }],
    { visibleRange: NOV },
  );
  assert.equal(event.id, "a");
  assert.equal(event.key, "a");
  assert.equal(event.allDay, false);
  assert.equal(toIsoString(event.start), "2026-11-17T09:00:00");
  assert.equal(toIsoString(event.end), "2026-11-17T10:30:00");
});

test("reversed timed ranges are swapped", () => {
  const [event] = normalizeEvents(
    [{ id: "a", start: "2026-11-17T10:00", end: "2026-11-17T09:00" }],
    { visibleRange: NOV },
  );
  assert.equal(toIsoString(event.start), "2026-11-17T09:00:00");
  assert.equal(toIsoString(event.end), "2026-11-17T10:00:00");
});

test("all-day end is exclusive; end === start means one day", () => {
  const [event] = normalizeEvents(
    [{ id: "a", start: "2026-11-17", end: "2026-11-17", allDay: true }],
    { visibleRange: NOV },
  );
  assert.equal(event.allDay, true);
  assert.equal(toIsoString(event.start), "2026-11-17T00:00:00");
  assert.equal(toIsoString(event.end), "2026-11-18T00:00:00");
});

test("all-day with a missing end is one day", () => {
  const [event] = normalizeEvents(
    [{ id: "a", start: "2026-11-17", end: undefined, allDay: true } as never],
    { visibleRange: NOV },
  );
  assert.equal(toIsoString(event.end), "2026-11-18T00:00:00");
});

test("a date-only string infers all-day", () => {
  const [event] = normalizeEvents(
    [{ id: "a", start: "2026-11-17", end: "2026-11-19" }],
    { visibleRange: NOV },
  );
  assert.equal(event.allDay, true);
  assert.equal(toIsoString(event.end), "2026-11-19T00:00:00");
});

test("zoned values are converted to the display zone", () => {
  const [event] = normalizeEvents(
    [
      {
        id: "a",
        start: "2026-11-17T09:00:00+07:00",
        end: "2026-11-17T10:00:00+07:00",
      },
    ],
    { visibleRange: NOV, timeZone: "UTC" },
  );
  // 09:00 +07:00 is 02:00 UTC.
  assert.equal(toIsoString(event.start), "2026-11-17T02:00:00");
  assert.equal(toIsoString(event.end), "2026-11-17T03:00:00");
});

test("events fully outside the visible range are dropped", () => {
  const events = normalizeEvents(
    [
      { id: "before", start: "2026-10-01T09:00", end: "2026-10-01T10:00" },
      { id: "after", start: "2026-12-01T09:00", end: "2026-12-01T10:00" },
      { id: "in", start: "2026-11-15T09:00", end: "2026-11-15T10:00" },
    ],
    { visibleRange: NOV },
  );
  assert.deepEqual(
    events.map((event) => event.id),
    ["in"],
  );
});

test("duplicate ids get suffixed keys", () => {
  const events = normalizeEvents(
    [
      { id: "x", start: "2026-11-01T09:00", end: "2026-11-01T10:00" },
      { id: "x", start: "2026-11-02T09:00", end: "2026-11-02T10:00" },
    ],
    { visibleRange: NOV },
  );
  assert.equal(events[0]?.key, "x");
  assert.equal(events[1]?.key, "x#1");
});

test("fromInclusiveEndDate returns the exclusive end date", () => {
  assert.equal(toIsoString(fromInclusiveEndDate("2026-11-20")), "2026-11-21");
  assert.equal(
    toIsoString(fromInclusiveEndDate(plainDate(2026, 11, 20))),
    "2026-11-21",
  );
});

test("toPlainDateTime accepts plain, zoned and string inputs", () => {
  assert.equal(
    toIsoString(toPlainDateTime("2026-11-17T09:30")),
    "2026-11-17T09:30:00",
  );
  assert.equal(
    toIsoString(toPlainDateTime("2026-11-17T09:30:00+02:00", "UTC")),
    "2026-11-17T07:30:00",
  );
});
