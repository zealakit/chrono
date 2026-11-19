import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  Calendar,
  CalendarEvent,
  CalendarEvents,
  CalendarMonthGrid,
  type CalendarOptions,
  recurrence,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

beforeEach(resetDom);
afterEach(cleanup);

type AppEvent = {
  id: string;
  start: string;
  end: string;
  title: string;
  recurringId?: string;
  recurrenceId?: string;
};

const events: AppEvent[] = [
  {
    id: "a",
    start: "2026-11-02T09:00:00",
    end: "2026-11-02T10:00:00",
    title: "Stand-up",
    rrule: "FREQ=WEEKLY;COUNT=4;BYDAY=MO",
  } as AppEvent,
  {
    id: "o",
    start: "2026-11-10T11:00:00",
    end: "2026-11-10T12:00:00",
    title: "Stand-up (moved)",
    recurringId: "a",
    recurrenceId: "2026-11-09T09:00:00",
  },
];

const base = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
  date: "2026-11-02",
  view: "month",
} satisfies CalendarOptions;

const grid = () =>
  h(CalendarMonthGrid, {
    children: (day: any) =>
      h(CalendarEvents, {
        day,
        children: (segments: any[]) =>
          segments.map((segment: any) =>
            h(CalendarEvent, { key: segment.key, segment }),
          ),
      }),
  });

test("the recurrence pack flows through React props and renders occurrences", () => {
  const { container } = render(
    h(Calendar, { ...base, events, recurrence } as CalendarOptions, grid()),
  );
  const nodes = [...container.querySelectorAll("[data-chrono-event]")];
  assert.equal(nodes.length, 4);
  assert.equal(container.querySelectorAll("[data-override]").length, 1);
  assert.equal(
    nodes.length,
    container.querySelectorAll("[data-recurring]").length,
  );
  assert.equal(nodes[0]?.getAttribute("aria-label"), "recurring event");
});

test("without the pack React shows only the first occurrence", () => {
  const { container } = render(
    h(Calendar, { ...base, events } as CalendarOptions, grid()),
  );
  const nodes = [...container.querySelectorAll("[data-chrono-event]")];
  assert.equal(nodes.length, 2);
  // The override carries recurringId, so it keeps data-recurring (05 E21).
  assert.equal(container.querySelectorAll("[data-recurring]").length, 1);
  assert.equal(container.querySelectorAll("[data-override]").length, 0);
});
