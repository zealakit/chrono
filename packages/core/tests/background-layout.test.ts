import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availabilityFromEvents,
  createCalendarController,
  backgroundAttributes,
  createAvailability,
  layoutBackgrounds,
  layoutTimelineBackgrounds,
  plainDate,
  plainDateTime,
  plainTime,
  type PlainDate,
} from "../dist/index.js";

const d = (year: number, month: number, day: number): PlainDate =>
  plainDate(year, month, day);
const t = (hour: number, minute = 0) => plainTime(hour, minute);

const spec = {
  timeZone: "UTC",
  open: [
    { type: "weekly", days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
  ],
  blocked: [{ type: "daily", start: "12:00", end: "13:00", reason: "Lunch" }],
} as const;

const monday = { date: d(2026, 11, 16), key: "2026-11-16" };

test("time-grid backgrounds match the event coordinate convention", () => {
  const availability = createAvailability(spec);
  const pieces = layoutBackgrounds({
    availability,
    timeZone: "UTC",
    days: [monday],
  });
  assert.deepEqual(
    pieces.map((piece) => [
      Math.round(piece.top * 24 * 60),
      Math.round(piece.height * 24 * 60),
      piece.status,
      piece.rules.map((rule) => rule.reason),
    ]),
    [
      [0, 9 * 60, "unavailable", []],
      [12 * 60, 60, "unavailable", ["Lunch"]],
      [17 * 60, 7 * 60, "unavailable", []],
    ],
  );
});

test("backgrounds clip to the visible axis", () => {
  const availability = createAvailability(spec);
  const pieces = layoutBackgrounds({
    availability,
    timeZone: "UTC",
    days: [monday],
    dayStart: t(8),
    dayEnd: t(18),
  });
  assert.deepEqual(
    pieces.map((piece) => [
      Math.round(piece.top * 10 * 60),
      Math.round(piece.height * 10 * 60),
    ]),
    [
      [0, 60],
      [4 * 60, 60],
      [9 * 60, 60],
    ],
  );
});

test("mode available renders the complement, mode false renders nothing", () => {
  const availability = createAvailability(spec);
  const available = layoutBackgrounds({
    availability,
    timeZone: "UTC",
    days: [monday],
    mode: "available",
    dayStart: t(8),
    dayEnd: t(18),
  });
  assert.deepEqual(
    available.map((piece) => Math.round(piece.top * 10 * 60)),
    [60, 5 * 60],
  );
  assert.deepEqual(
    layoutBackgrounds({
      availability,
      timeZone: "UTC",
      days: [monday],
      mode: false,
    }),
    [],
  );
});

test("resource columns filter by resource", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    blocked: [
      {
        type: "weekly",
        days: [1],
        start: "10:00",
        end: "11:00",
        resourceId: "room-a",
      },
    ],
  });
  const pieces = layoutBackgrounds({
    availability,
    timeZone: "UTC",
    days: [
      {
        date: d(2026, 11, 16),
        key: "2026-11-16",
        resourceId: "room-a",
        resourceKey: "room-a",
      },
      {
        date: d(2026, 11, 16),
        key: "2026-11-16",
        resourceId: "room-b",
        resourceKey: "room-b",
      },
    ],
  });
  assert.deepEqual(
    pieces.map((piece) => [piece.resourceKey, Math.round(piece.top * 24 * 60)]),
    [["room-a", 10 * 60]],
  );
});

test("timeline backgrounds use left and width", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    blocked: [{ type: "daily", start: "12:00", end: "13:00" }],
  });
  const pieces = layoutTimelineBackgrounds({
    availability,
    timeZone: "UTC",
    rows: [{ key: "room-a", resourceId: "room-a", resourceKey: "room-a" }],
    start: plainDateTime(d(2026, 11, 16), t(9)),
    end: plainDateTime(d(2026, 11, 16), t(17)),
  });
  assert.equal(pieces.length, 1);
  const first = pieces[0];
  assert.ok(first);
  assert.equal(Math.round(first.left * 8 * 60), 3 * 60);
  assert.equal(Math.round(first.width * 8 * 60), 60);
});

test("background attributes carry status and position, never rule data", () => {
  const availability = createAvailability({
    timeZone: "UTC",
    blocked: [
      {
        type: "daily",
        start: "12:00",
        end: "13:00",
        id: "lunch",
        reason: "Lunch",
        data: { secret: 1 },
      },
    ],
  });
  const [piece] = layoutBackgrounds({
    availability,
    timeZone: "UTC",
    days: [monday],
  });
  assert.ok(piece);
  assert.deepEqual(backgroundAttributes(piece), {
    "aria-hidden": "true",
    "data-chrono-background": true,
    "data-status": "unavailable",
    "data-chrono-key": "2026-11-16",
    "--chrono-background-top": 0.5,
    "--chrono-background-height": 1 / 24,
    "data-rule-id": "lunch",
  });
});

test("availabilityFromEvents turns bookings into blocked rules", () => {
  const events = [
    {
      id: "a",
      start: "2026-11-16T09:00",
      end: "2026-11-16T10:00",
      title: "A",
      resourceId: "room-a",
    },
    {
      id: "b",
      start: "2026-11-16",
      end: "2026-11-17",
      allDay: true,
      title: "B",
    },
    {
      id: "c",
      start: "2026-11-16T11:00",
      end: "2026-11-16T12:00",
      title: "C",
      resourceId: "room-b",
    },
  ];
  const specOf = availabilityFromEvents(events, { resourceId: "room-a" });
  assert.deepEqual(
    (specOf.blocked ?? []).map((rule) => rule.id),
    ["a", "b"],
  );
  const excluded = availabilityFromEvents(events, { excludeId: "a" });
  assert.deepEqual(
    (excluded.blocked ?? []).map((rule) => rule.id),
    ["b", "c"],
  );
});

test("the controller exposes background pieces for the time grid", () => {
  const controller = createCalendarController({
    id: "cal",
    locale: "en-US",
    timeZone: "UTC",
    now: Date.UTC(2026, 10, 17, 12),
    defaultDate: "2026-11-17",
    defaultView: "week",
    timeGrid: { start: "08:00", end: "18:00", step: 60 },
    availability: {
      open: [{ type: "daily", start: "09:00", end: "17:00" }],
    },
  });
  const state = controller.getState();
  assert.ok(state.backgrounds.length > 0);
  const piece = state.backgrounds[0];
  assert.ok(piece);
  assert.equal(piece.status, "unavailable");
  const attributes = controller.getBackgroundAttributes(piece);
  assert.equal(attributes["data-chrono-background"], true);
  assert.equal(attributes["--chrono-background-top"], 0);
  // The same state reference is reused while nothing changes.
  assert.equal(controller.getState().backgrounds, state.backgrounds);
});

test("backgrounds: false turns pieces off", () => {
  const controller = createCalendarController({
    id: "cal",
    locale: "en-US",
    timeZone: "UTC",
    now: Date.UTC(2026, 10, 17, 12),
    defaultView: "week",
    backgrounds: false,
    availability: {
      blocked: [{ type: "daily", start: "09:00", end: "17:00" }],
    },
  });
  assert.deepEqual(controller.getState().backgrounds, []);
});
