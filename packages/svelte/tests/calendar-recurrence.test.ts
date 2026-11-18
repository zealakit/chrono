import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { recurrence } from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";
import {
  calendarSource,
  cleanupFixtures,
  mountSource,
  type Mounted,
} from "./support/reference.ts";

const events = [
  {
    id: "a",
    start: "2026-11-02T09:00:00",
    end: "2026-11-02T10:00:00",
    rrule: "FREQ=WEEKLY;COUNT=4;BYDAY=MO",
  },
  {
    id: "o",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
    start: "2026-11-10T11:00:00",
    end: "2026-11-10T12:00:00",
  },
];

const live: Mounted[] = [];

afterEach(() => {
  for (const mounted of live.splice(0)) mounted.destroy();
  resetDom();
});
after(cleanupFixtures);

test("Svelte forwards the recurrence pack and renders occurrences", async () => {
  const mounted = await mountSource(calendarSource(), {
    id: "cal",
    locale: "en-US",
    timeZone: "UTC",
    now: Date.UTC(2026, 10, 17, 12),
    weekStartsOn: 1,
    date: "2026-11-02",
    view: "month",
    events,
    recurrence,
  });
  live.push(mounted);
  const root = mounted.target;
  assert.equal(root.querySelectorAll("[data-chrono-event]").length, 4);
  assert.equal(root.querySelectorAll("[data-override]").length, 1);
});
