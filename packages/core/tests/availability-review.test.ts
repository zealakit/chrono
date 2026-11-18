import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availabilityFromEvents,
  createCalendarController,
  layoutBackgrounds,
  resourceViews,
  wallIso,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import {
  compileAvailability,
  createAvailability,
  plainDate,
  plainTime,
} from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1,
};

test("compileAvailability keys its cache by options, not only by spec identity", () => {
  const spec = {
    open: [{ type: "daily", start: "09:00", end: "17:00" }],
  } as const;
  const utc = compileAvailability(spec as never, { timeZone: "UTC" });
  const ny = compileAvailability(spec as never, {
    timeZone: "America/New_York",
  });
  assert.notEqual(utc, ny);
  assert.equal(compileAvailability(spec as never, { timeZone: "UTC" }), utc);
  const lead = { leadTime: { hours: 2 } };
  const early = compileAvailability(lead, { now: Date.UTC(2026, 10, 17, 8) });
  const late = compileAvailability(lead, { now: Date.UTC(2026, 10, 17, 20) });
  assert.notEqual(early, late);
  assert.equal(
    early.isTimeAvailable(plainDate(2026, 11, 17), plainTime(9, 0)),
    false,
  );
  assert.equal(
    early.isTimeAvailable(plainDate(2026, 11, 17), plainTime(11, 0)),
    true,
  );
  assert.equal(
    late.isTimeAvailable(plainDate(2026, 11, 17), plainTime(11, 0)),
    false,
  );
});

test("availabilityFromEvents reads offsets in the given zone", () => {
  const spec = availabilityFromEvents(
    [{ id: 1, start: "2026-11-17T14:00:00Z", end: "2026-11-17T15:00:00Z" }],
    { timeZone: "America/New_York" },
  );
  assert.equal(spec.timeZone, "America/New_York");
  const rule = spec.blocked?.[0] as { start: string; end: string };
  assert.equal(rule.start, "2026-11-17T09:00:00");
  assert.equal(rule.end, "2026-11-17T10:00:00");
  const availability = createAvailability(spec, {
    timeZone: "America/New_York",
  });
  assert.equal(
    availability.isTimeAvailable(plainDate(2026, 11, 17), plainTime(9, 30)),
    false,
  );
  assert.equal(
    availability.isTimeAvailable(plainDate(2026, 11, 17), plainTime(10, 0)),
    true,
  );
  assert.equal(wallIso("2026-11-17T09:00"), "2026-11-17T09:00");
});

test("background pieces keep the wall-time axis on a DST day", () => {
  const availability = createAvailability(
    {
      open: [{ type: "daily", start: "09:00", end: "17:00" }],
      timeZone: "America/New_York",
    },
    { timeZone: "America/New_York" },
  );
  const pieces = layoutBackgrounds({
    availability,
    timeZone: "America/New_York",
    days: [{ date: plainDate(2026, 3, 8), key: "2026-03-08" }],
    mode: "both",
  });
  const available = pieces.find((p) => p.status === "available");
  assert.ok(available);
  assert.equal(available.top, 9 / 24);
  assert.equal(available.height, 8 / 24);
  const total = pieces.reduce((sum, p) => sum + p.height, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `pieces cover the axis, got ${total}`);
});

test("cells and slots carry data-unavailable, data-partially-available and a label suffix", () => {
  const availability = {
    blocked: [
      { type: "dates", dates: ["2026-11-18"], reason: "Holiday" },
      { type: "daily", start: "12:00", end: "13:00", id: "lunch" },
    ],
  } as never;
  const c = createCalendarController({ ...base, availability } as never);
  const days = (c.getState().layout as any).months[0].weeks
    .flat()
    .flatMap((w: any) => w.days ?? w);
  const cell = (key: string) =>
    c.getCellAttributes(days.find((d: any) => d.key === key));
  const holiday = cell("2026-11-18");
  assert.equal(holiday["data-unavailable"], true);
  assert.match(String(holiday["aria-label"]), /unavailable: Holiday/);
  const lunchDay = cell("2026-11-17");
  assert.equal(lunchDay["data-unavailable"], false);
  assert.equal(lunchDay["data-partially-available"], true);
  const grid = createCalendarController({
    ...base,
    defaultView: "day",
    availability,
  } as never);
  const layout = grid.getState().layout as any;
  const slot = (hour: number) =>
    layout.slots.find(
      (s: any) => s.start.hour === hour && s.start.minute === 0,
    );
  assert.equal(
    grid.getSlotAttributes(slot(12), layout.days[0])["data-unavailable"],
    true,
  );
  assert.equal(
    grid.getSlotAttributes(slot(10), layout.days[0])["data-unavailable"],
    false,
  );
});

test("getAvailabilityLabel customizes the reason", () => {
  const c = createCalendarController({
    ...base,
    availability: {
      blocked: [{ type: "dates", dates: ["2026-11-18"], reason: "x" }],
    },
    getAvailabilityLabel: () => "Closed for the day",
  } as never);
  const days = (c.getState().layout as any).months[0].weeks
    .flat()
    .flatMap((w: any) => w.days ?? w);
  const label = c.getCellAttributes(
    days.find((d: any) => d.key === "2026-11-18"),
  )["aria-label"];
  assert.match(String(label), /Closed for the day/);
});

test("getResourceAvailability shades each resource with its own hours", () => {
  const c = createCalendarController({
    ...base,
    views: resourceViews,
    defaultView: "resourceDay",
    defaultDate: plainDate(2026, 11, 17),
    resources: [{ id: "A" }, { id: "B" }],
    availability: { open: [{ type: "daily", start: "08:00", end: "18:00" }] },
    getResourceAvailability: (r: any) => ({
      open: [
        {
          type: "daily",
          start: r.id === "A" ? "09:00" : "12:00",
          end: "17:00",
        },
      ],
    }),
  } as never);
  const pieces = c.getState().backgrounds as any[];
  const firstOpen = (key: string) =>
    pieces
      .filter((p) => p.resourceKey === key)
      .sort((a, b) => a.top - b.top)[0];
  assert.equal(firstOpen("A").height, 9 / 24, "A is closed until 09:00");
  assert.equal(firstOpen("B").height, 12 / 24, "B is closed until 12:00");
});

test("backgrounds follow timeGrid changes", () => {
  const c = createCalendarController({
    ...base,
    defaultView: "day",
    availability: {
      blocked: [{ type: "daily", start: "08:00", end: "09:00" }],
    },
    timeGrid: { start: "00:00" },
  } as never);
  const before = (c.getState().backgrounds as any[])[0];
  assert.equal(before.top, 8 / 24);
  c.setOptions({ timeGrid: { start: "06:00", end: "12:00" } } as never);
  const after = (c.getState().backgrounds as any[])[0];
  assert.equal(after.top, 2 / 6);
});
