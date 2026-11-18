import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeEvents, recurrence } from "../dist/calendar/index.js";
import { parseIsoDate } from "../dist/foundation/index.js";

const visibleRange = {
  start: parseIsoDate("2026-11-01"),
  end: parseIsoDate("2026-11-30"),
};

const series = {
  id: "a",
  start: "2026-11-02T09:00:00",
  end: "2026-11-02T10:00:00",
  rrule: "FREQ=WEEKLY;COUNT=4;BYDAY=MO",
};

const run = (events: readonly unknown[]) =>
  normalizeEvents(events as never, {
    visibleRange,
    timeZone: "UTC",
    recurrence,
  });

test("an override replaces its occurrence and keeps the occurrence key", () => {
  const override = {
    id: "o",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
    start: "2026-11-10T11:00:00",
    end: "2026-11-10T12:00:00",
  };
  const events = run([series, override]);
  assert.deepEqual(
    events.map((event) => event.start.day),
    [2, 10, 16, 23],
  );
  const moved = events[1];
  assert.equal(moved?.key, "a:2026-11-09T09:00:00");
  assert.equal(moved?.recurrence?.isOverride, true);
  assert.equal(moved?.recurrence?.series, series);
  assert.equal(moved?.event, override);
});

test("an override outside the visible range still removes its occurrence", () => {
  const override = {
    id: "o",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
    start: "2026-12-05T11:00:00",
    end: "2026-12-05T12:00:00",
  };
  assert.deepEqual(
    run([series, override]).map((event) => event.start.day),
    [2, 16, 23],
  );
});

test("an override of an excluded date is ignored", () => {
  const excluded = {
    ...series,
    exdates: ["2026-11-09T09:00:00"],
  };
  const override = {
    id: "o",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
    start: "2026-11-10T11:00:00",
    end: "2026-11-10T12:00:00",
  };
  assert.deepEqual(
    run([excluded, override]).map((event) => event.start.day),
    [2, 16, 23],
  );
});

test("the last override for one occurrence wins", () => {
  const first = {
    id: "o1",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
    start: "2026-11-10T11:00:00",
    end: "2026-11-10T12:00:00",
  };
  const second = {
    ...first,
    id: "o2",
    start: "2026-11-11T11:00:00",
    end: "2026-11-11T12:00:00",
  };
  const events = run([series, first, second]);
  assert.deepEqual(
    events.map((event) => [event.start.day, event.event.id]),
    [
      [2, "a"],
      [11, "o2"],
      [16, "a"],
      [23, "a"],
    ],
  );
});

test("pre-expanded occurrences with only recurringId stay plain events", () => {
  const preExpanded = {
    id: "p",
    recurringId: "series-1",
    start: "2026-11-03T09:00:00",
    end: "2026-11-03T10:00:00",
  };
  const events = run([preExpanded]);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.event, preExpanded);
  assert.equal(events[0]?.recurrence, undefined);
});
