import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCalendarController,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { plainDate, plainTime, toIsoString } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
};

test("month view lays out events into state", () => {
  const controller = createCalendarController({
    ...base,
    events: [
      { id: "A", start: "2026-11-16", end: "2026-11-19", allDay: true },
      { id: "B", start: "2026-11-17T09:00", end: "2026-11-17T10:00" },
    ],
  });
  const events = controller.getState().events;
  assert.ok(Array.isArray(events));
  assert.equal(events.length, 2);
  const a = events.find((s) => s.event.id === "A");
  assert.ok(a);
  assert.equal(a.allDay, true);
  assert.equal((a as { lane: number }).lane, 0);
});

test("time grid lays out timed events, the all-day row and the now-indicator", () => {
  const controller = createCalendarController({
    ...base,
    defaultView: "day",
    events: [
      { id: "allDay", start: "2026-11-17", end: "2026-11-18", allDay: true },
      { id: "timed", start: "2026-11-17T09:00", end: "2026-11-17T10:00" },
    ],
  });
  const state = controller.getState();
  const allDay = state.allDayRow;
  assert.equal(allDay.length, 1);
  assert.equal(allDay[0]?.event.id, "allDay");
  const timed = state.events as { event: { id: string } }[];
  assert.equal(timed.length, 1);
  assert.equal(timed[0]?.event.id, "timed");
  assert.ok(state.nowIndicator); // now = 12:00 UTC, inside the day axis
  assert.equal(state.nowIndicator.top, 12 / 24);
});

test("event attributes carry --chrono-* properties (plan 05 E10)", () => {
  const controller = createCalendarController({
    ...base,
    defaultView: "day",
    events: [
      { id: "timed", start: "2026-11-17T09:00", end: "2026-11-17T10:00" },
    ],
  });
  const segment = controller.getState().events[0];
  assert.ok(segment);
  const attributes = controller.getEventAttributes(segment as never);
  assert.equal(attributes["data-chrono-event"], true);
  assert.equal(attributes["--chrono-event-top"], 9 / 24);
  assert.equal(attributes["--chrono-event-height"], 1 / 24);
  assert.equal(attributes["--chrono-event-column"], 0);
});

test("selectEvent updates the selected id", () => {
  const controller = createCalendarController({
    ...base,
    events: [{ id: "A", start: "2026-11-17T09:00", end: "2026-11-17T10:00" }],
  });
  controller.selectEvent("A");
  assert.equal(controller.getState().selectedEventId, "A");
  controller.selectEvent(null);
  assert.equal(controller.getState().selectedEventId, null);
});

test("selection confirms a proposal (E14)", () => {
  let proposal:
    | { kind: string; allDay: boolean; start: unknown; end: unknown }
    | undefined;
  const controller = createCalendarController({
    ...base,
    selectable: true,
    onSelectRange: (p) => {
      proposal = p as never;
    },
  });
  controller.startSelection({ date: plainDate(2026, 11, 20) }, "keyboard");
  controller.confirmSelection();
  assert.ok(proposal);
  assert.equal(proposal.kind, "create");
  assert.equal(proposal.allDay, true);
  assert.equal(toIsoString(proposal.start as never), "2026-11-20");
  assert.equal(toIsoString(proposal.end as never), "2026-11-21");
});

test("a timed selection starts at the clicked slot, not midnight (E14)", () => {
  let proposal: { start: unknown; end: unknown; allDay: boolean } | undefined;
  const controller = createCalendarController({
    ...base,
    defaultView: "day",
    selectable: true,
    timeGrid: { start: "06:00", end: "22:00", step: 60 },
    onSelectRange: (p) => {
      proposal = p as never;
    },
  });
  controller.startSelection(
    { date: plainDate(2026, 11, 17), time: plainTime(9, 0) },
    "pointer",
  );
  controller.confirmSelection();
  assert.ok(proposal);
  assert.equal(proposal.allDay, false);
  assert.equal(toIsoString(proposal.start as never), "2026-11-17T09:00:00");
  assert.equal(toIsoString(proposal.end as never), "2026-11-17T10:00:00");
});

test("validateSelection blocks confirm (E16)", () => {
  let confirmed = 0;
  const controller = createCalendarController({
    ...base,
    selectable: true,
    validateSelection: () => false,
    onSelectRange: () => {
      confirmed += 1;
    },
  });
  controller.startSelection({ date: plainDate(2026, 11, 20) }, "keyboard");
  controller.confirmSelection();
  assert.equal(confirmed, 0);
});

test("enterCell and interaction keyboard navigation", () => {
  const controller = createCalendarController({
    ...base,
    events: [
      { id: "A", start: "2026-11-17T09:00", end: "2026-11-17T10:00" },
      { id: "B", start: "2026-11-17T09:30", end: "2026-11-17T10:30" },
    ],
  });
  // Month view: the focused cell (Nov 17) has two events.
  const cellKey = "2026-11-17";
  controller.enterCell(cellKey);
  assert.equal(controller.getState().focus.mode, "interaction");
  assert.ok(controller.getState().focus.itemKey);
  // Tab moves to the next event inside the cell.
  controller.handleKeyDown("Tab", { shift: false, ctrl: false, meta: false });
  assert.equal(controller.getState().focus.mode, "interaction");
  // Escape returns to navigation mode.
  controller.handleKeyDown("Escape", {
    shift: false,
    ctrl: false,
    meta: false,
  });
  assert.equal(controller.getState().focus.mode, "navigation");
});

test("re-rendering with the same events array does not notify (R1)", () => {
  const events = [
    { id: "A", start: "2026-11-17T09:00", end: "2026-11-17T10:00" },
  ];
  const controller = createCalendarController({ ...base, events });
  const before = controller.getState().events;
  let notified = 0;
  controller.subscribe(() => {
    notified += 1;
  });
  controller.setOptions({ events });
  assert.equal(notified, 0);
  assert.equal(controller.getState().events, before);
});

test("an event object with a cycle does not throw (R1)", () => {
  const event = {
    id: "A",
    start: "2026-11-17T09:00",
    end: "2026-11-17T10:00",
  } as { id: string; start: string; end: string; self?: unknown };
  event.self = event; // a cycle in the app data
  const controller = createCalendarController({
    ...base,
    events: [event],
  });
  const segments = controller.getState().events;
  assert.equal((segments as { event: unknown }[]).length, 1);
  controller.setOptions({ events: [event] });
  assert.ok(true);
});
