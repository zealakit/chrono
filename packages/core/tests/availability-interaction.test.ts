import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availabilityFromEvents,
  createCalendarController,
  type CalendarOptions,
  type EventChangeProposal,
  type SelectionProposal,
} from "../dist/calendar/index.js";
import {
  createAvailability,
  plainDate,
  plainDateTime,
  plainTime,
} from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
  defaultView: "day",
  selectable: true,
  snapDuration: 15,
  timeGrid: { start: "08:00", end: "18:00", step: 60 },
};

const day = plainDate(2026, 11, 17);
const at = (hour: number) => ({ date: day, time: plainTime(hour, 0) });
const closed = {
  open: [{ type: "daily", start: "09:00", end: "17:00" }] as const,
};
const previewKey = { key: "2026-11-17" } as never;

function make(extra: Partial<CalendarOptions> = {}) {
  const selections: SelectionProposal[] = [];
  const proposals: EventChangeProposal[] = [];
  const controller = createCalendarController({
    ...base,
    onSelectRange: (proposal: SelectionProposal) => {
      selections.push(proposal);
    },
    onEventChange: (proposal: EventChangeProposal) => {
      proposals.push(proposal);
    },
    ...extra,
  });
  controller.start();
  return { controller, selections, proposals };
}

test("a selection inside open hours is valid and confirmed", () => {
  const { controller, selections } = make({ availability: closed });
  controller.startSelection(at(9), "pointer");
  controller.extendSelection(at(11));
  assert.equal(
    controller.getSelectionPreviewAttributes(previewKey)["data-invalid"],
    false,
  );
  controller.confirmSelection();
  assert.equal(selections.length, 1);
});

test("a selection over closed time is invalid and not confirmed", () => {
  const { controller, selections } = make({ availability: closed });
  controller.startSelection(at(8), "pointer");
  controller.extendSelection(at(10));
  assert.equal(
    controller.getSelectionPreviewAttributes(previewKey)["data-invalid"],
    true,
  );
  controller.confirmSelection();
  assert.equal(selections.length, 0);
});

test("availabilityBlocksInteraction false allows warn-only UIs", () => {
  const { controller, selections } = make({
    availability: closed,
    availabilityBlocksInteraction: false,
  });
  controller.startSelection(at(8), "pointer");
  controller.extendSelection(at(10));
  assert.equal(
    controller.getSelectionPreviewAttributes(previewKey)["data-invalid"],
    false,
  );
  controller.confirmSelection();
  assert.equal(selections.length, 1);
});

test("a move onto unavailable time is invalid and drops nothing", () => {
  const events = [
    { id: "A", start: "2026-11-17T10:00", end: "2026-11-17T11:00" },
  ];
  const { controller, proposals } = make({
    events,
    editable: true,
    availability: closed,
  });
  const key = (controller.getState().events as { key: string }[])[0]
    ?.key as string;
  assert.equal(controller.startMove(key), true);
  controller.updateDrag({ cellKey: "2026-11-17T07:00:00" } as never);
  assert.equal(controller.getState().drag?.valid, false);
  controller.dropDrag();
  assert.equal(proposals.length, 0);
});

test("a move overlapping the event's own old slot stays valid (plan 11 R6)", () => {
  const events = [
    { id: "A", start: "2026-11-17T10:00", end: "2026-11-17T11:00" },
  ];
  const extra = {
    ...base,
    timeGrid: { start: "08:00", end: "18:00", step: 30 },
  };
  const withExclude = make({
    ...extra,
    events,
    editable: true,
    availability: ({ excludeEventId }) =>
      availabilityFromEvents(events, { excludeId: excludeEventId }),
  });
  const key = (withExclude.controller.getState().events as { key: string }[])[0]
    ?.key as string;
  assert.equal(withExclude.controller.startMove(key), true);
  withExclude.controller.updateDrag({
    cellKey: "2026-11-17T10:30:00",
  } as never);
  assert.equal(withExclude.controller.getState().drag?.valid, true);
  withExclude.controller.dropDrag();
  assert.equal(withExclude.proposals.length, 1);

  const without = make({
    ...extra,
    events,
    editable: true,
    availability: availabilityFromEvents(events),
  });
  assert.equal(without.controller.startMove(key), true);
  without.controller.updateDrag({ cellKey: "2026-11-17T10:30:00" } as never);
  assert.equal(without.controller.getState().drag?.valid, false);
});

test("a compiled model is used as-is (no double compile)", () => {
  const compiled = createAvailability(closed, { timeZone: "UTC" });
  assert.equal(
    compiled.isRangeAvailable(
      plainDateTime(day, plainTime(8, 0)),
      plainDateTime(day, plainTime(10, 0)),
    ),
    false,
  );
  const { controller, selections } = make({ availability: compiled });
  controller.startSelection(at(9), "pointer");
  controller.extendSelection(at(10));
  controller.confirmSelection();
  assert.equal(selections.length, 1);
});
