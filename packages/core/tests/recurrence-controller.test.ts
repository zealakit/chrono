import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type EventChangeProposal,
  type MonthSegment,
  createCalendarController,
  recurrence,
} from "../dist/calendar/index.js";

const events = [
  {
    id: "a",
    title: "Stand-up",
    start: "2026-11-02T09:00:00",
    end: "2026-11-02T10:00:00",
    rrule: "FREQ=WEEKLY;COUNT=4;BYDAY=MO",
  },
  {
    id: "o",
    title: "Stand-up (moved)",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
    start: "2026-11-10T11:00:00",
    end: "2026-11-10T12:00:00",
  },
];

function build() {
  const proposals: EventChangeProposal<(typeof events)[number]>[] = [];
  const controller = createCalendarController({
    date: "2026-11-02",
    view: "month",
    locale: "en-US",
    timeZone: "UTC",
    events,
    recurrence,
    editable: true,
    onEventChange: (proposal) => {
      proposals.push(proposal);
    },
  });
  controller.start();
  return { controller, proposals };
}

test("occurrence segments carry recurrence data and attributes", () => {
  const { controller } = build();
  const segments = controller.getState().events as MonthSegment<
    (typeof events)[number]
  >[];
  const occurrence = segments.find(
    (segment) => segment.recurrence && !segment.recurrence.isOverride,
  );
  const override = segments.find((segment) => segment.recurrence?.isOverride);
  assert.ok(occurrence);
  assert.ok(override);
  assert.equal(occurrence.recurrence?.series, events[0]);
  assert.equal(occurrence.recurrence?.occurrenceStart.day, 2);

  const occurrenceAttributes = controller.getEventAttributes(occurrence);
  assert.equal(occurrenceAttributes["data-recurring"], true);
  assert.equal(occurrenceAttributes["data-override"], false);
  assert.equal(occurrenceAttributes["aria-label"], "recurring event");

  const overrideAttributes = controller.getEventAttributes(override);
  assert.equal(overrideAttributes["data-recurring"], true);
  assert.equal(overrideAttributes["data-override"], true);
  assert.ok(override.key.startsWith("a:2026-11-09T09:00:00:"));
});

test("dragging an occurrence proposes a change carrying its recurrence data", () => {
  const { controller, proposals } = build();
  const segments = controller.getState().events as MonthSegment<
    (typeof events)[number]
  >[];
  const occurrence = segments.find(
    (segment) => segment.recurrence?.occurrenceStart.day === 16,
  );
  assert.ok(occurrence);
  assert.equal(controller.startMove(occurrence.key, "keyboard"), true);
  controller.updateDrag({ cellKey: "2026-11-18" });
  controller.dropDrag();
  assert.equal(proposals.length, 1);
  const proposal = proposals[0];
  assert.equal(proposal?.recurrence?.recurringId, "a");
  assert.equal(proposal?.recurrence?.occurrenceStart.day, 16);
  assert.equal(proposal?.from.start.day, 16);
  assert.equal(proposal?.to.start.day, 18);
});

test("without the pack an rrule event shows only its first occurrence", () => {
  const controller = createCalendarController({
    date: "2026-11-02",
    view: "month",
    locale: "en-US",
    timeZone: "UTC",
    events,
  });
  const segments = controller.getState().events as MonthSegment<
    (typeof events)[number]
  >[];
  assert.deepEqual(
    segments.filter((segment) => segment.event.id === "a").length,
    1,
  );
});
