import assert from "node:assert/strict";
import { test } from "node:test";
import { createDateTimePanelController } from "../dist/datetime/index.js";
import {
  type AvailabilitySpec,
  plainDate,
  plainDateTime,
  plainTime,
} from "../dist/foundation/index.js";

const NOW = Date.UTC(2026, 10, 17, 12);
const base = {
  locale: "en-US",
  timeZone: "UTC",
  now: NOW,
  weekStartsOn: 1 as const,
};
const spec: AvailabilitySpec = {
  timeZone: "UTC",
  open: [
    { type: "weekly", days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
  ],
  blocked: [{ type: "daily", start: "12:00", end: "13:00" }],
};

test("the date part sees the same availability model", () => {
  const c = createDateTimePanelController({ ...base, availability: spec });
  const days =
    c.getState().date.months[0]?.weeks.flatMap((week) => week.days) ?? [];
  const monday = days.find((day) => day.key === "2026-11-16");
  const saturday = days.find((day) => day.key === "2026-11-21");
  assert.equal(monday?.partiallyAvailable, true);
  assert.equal(monday?.unavailable, false);
  assert.equal(saturday?.unavailable, true);
});

test("the time part blocks times on the selected day", () => {
  const c = createDateTimePanelController({
    ...base,
    value: plainDateTime(plainDate(2026, 11, 16), plainTime(9, 0)),
    availability: spec,
    time: { layout: "list" },
  });
  const options = c.getState().time.groups.flatMap((group) => group.options);
  assert.equal(
    options.find((option) => option.key === "12:00")?.unavailable,
    true,
  );
  assert.equal(
    options.find((option) => option.key === "13:00")?.unavailable,
    false,
  );
});
