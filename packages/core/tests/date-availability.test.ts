import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDatePanelController,
  createDateRangePanelController,
} from "../dist/date/index.js";
import { type AvailabilitySpec, plainDate } from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base = {
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1 as const,
};
const d = (month: number, day: number) => plainDate(2026, month, day);
const cells = (c: { getState(): { months: { weeks: { days: any[] }[] }[] } }) =>
  c.getState().months[0]?.weeks.flatMap((week) => week.days) ?? [];
const spec: AvailabilitySpec = {
  timeZone: "UTC",
  open: [
    { type: "weekly", days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
  ],
  blocked: [{ type: "daily", start: "12:00", end: "13:00", reason: "Lunch" }],
};

test("a fully unavailable day is not selectable and says so", () => {
  const c = createDatePanelController({ ...base, availability: spec });
  const saturday = cells(c).find((cell) => cell.key === "2026-11-21");
  assert.ok(saturday);
  assert.equal(saturday.unavailable, true);
  assert.equal(saturday.partiallyAvailable, false);
  const attributes = c.getCellAttributes(saturday);
  assert.equal(attributes["data-unavailable"], true);
  assert.equal(attributes["data-partially-available"], false);
  assert.match(attributes["aria-label"] as string, /unavailable/);
});

test("a partial day stays selectable and is marked", () => {
  const c = createDatePanelController({ ...base, availability: spec });
  const monday = cells(c).find((cell) => cell.key === "2026-11-16");
  assert.ok(monday);
  assert.equal(monday.unavailable, false);
  assert.equal(monday.partiallyAvailable, true);
  const attributes = c.getCellAttributes(monday);
  assert.equal(attributes["data-partially-available"], true);
  assert.equal(attributes["data-unavailable"], false);
  assert.match(attributes["aria-label"] as string, /partially available/);
  assert.match(attributes["aria-label"] as string, /Lunch/);
});

test("a range ending on a fully unavailable day is rejected", () => {
  const c = createDateRangePanelController({ ...base, availability: spec });
  const reasons: string[] = [];
  c.setOptions({ onInvalidRange: (reason: string) => reasons.push(reason) });
  c.pick(d(11, 20), "pointer");
  c.pick(d(11, 21), "pointer");
  assert.ok(reasons.length > 0);
});
