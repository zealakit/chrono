import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement as h } from "react";
import {
  Calendar,
  CalendarEvent,
  CalendarEvents,
  CalendarMonthGrid,
  CalendarMoreButton,
  type CalendarOptions,
} from "../dist/calendar/index.js";
import { resetDom } from "./support/dom.ts";

const base: CalendarOptions = {
  id: "cal",
  locale: "en-US",
  timeZone: "UTC",
  now: Date.UTC(2026, 10, 17, 12),
  weekStartsOn: 1,
};

type AppEvent = {
  id: string;
  start: string;
  end: string;
  allDay?: boolean;
  title: string;
};

const EVENTS: AppEvent[] = [
  {
    id: "A",
    start: "2026-11-16",
    end: "2026-11-19",
    allDay: true,
    title: "Holiday",
  },
  {
    id: "B",
    start: "2026-11-17T09:00",
    end: "2026-11-17T10:00",
    title: "Stand-up",
  },
  {
    id: "C",
    start: "2026-11-17",
    end: "2026-11-18",
    allDay: true,
    title: "All day",
  },
];

const monthGrid = () =>
  h(CalendarMonthGrid, {
    children: (day: any) =>
      h(CalendarEvents, {
        day,
        children: (segments: any[]) =>
          segments.map((segment: any) =>
            h(
              CalendarEvent,
              { key: segment.key, segment },
              (segment.event as AppEvent).title,
            ),
          ),
      }),
  });

beforeEach(resetDom);
afterEach(cleanup);

test("events render with data-chrono-event and --chrono-* custom properties", () => {
  const { container } = render(
    h(Calendar, { ...base, events: EVENTS as never }, monthGrid()),
  );
  const events = container.querySelectorAll("[data-chrono-event]");
  assert.equal(events.length, 3);
  const style = (events[0] as HTMLElement).getAttribute("style") ?? "";
  assert.match(style, /--chrono-event-start/);
  assert.match(style, /--chrono-event-days/);
  assert.match(style, /--chrono-event-lane/);
  // The app's own field reaches the render callback.
  assert.match((events[0] as HTMLElement).textContent ?? "", /Holiday/);
});

test("clicking an event selects it", () => {
  let selected: string | null = null;
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        events: EVENTS as never,
        onSelectedEventChange: (id) => {
          selected = id as string | null;
        },
      },
      monthGrid(),
    ),
  );
  const holiday = [...container.querySelectorAll("[data-chrono-event]")].find(
    (el) => el.textContent?.includes("Holiday"),
  ) as HTMLElement;
  fireEvent.click(holiday);
  assert.equal(selected, "A");
  assert.equal(holiday.getAttribute("data-selected"), "");
  assert.equal(holiday.getAttribute("aria-pressed"), "true");
});

test("double-clicking an event activates it", () => {
  const activated: string[] = [];
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        events: EVENTS as never,
        onEventActivate: (event, info) =>
          activated.push(`${(event as AppEvent).id} ${info.source}`),
      },
      monthGrid(),
    ),
  );
  const holiday = [...container.querySelectorAll("[data-chrono-event]")].find(
    (el) => el.textContent?.includes("Holiday"),
  ) as HTMLElement;
  fireEvent.doubleClick(holiday);
  assert.deepEqual(activated, ["A pointer"]);
});

test("the +N more button fires onMoreActivate with the hidden events", () => {
  const hidden: string[] = [];
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        eventLimit: 2,
        events: [
          {
            id: "A",
            start: "2026-11-16",
            end: "2026-11-19",
            allDay: true,
            title: "A",
          },
          {
            id: "B",
            start: "2026-11-17T09:00",
            end: "2026-11-17T10:00",
            title: "B",
          },
          {
            id: "C",
            start: "2026-11-17",
            end: "2026-11-18",
            allDay: true,
            title: "C",
          },
          {
            id: "D",
            start: "2026-11-18",
            end: "2026-11-23",
            allDay: true,
            title: "D",
          },
        ] as never,
        onMoreActivate: (_date, events) =>
          hidden.push(...events.map((e) => (e as AppEvent).title)),
      },
      h(CalendarMonthGrid, {
        children: (day: any) => h(CalendarMoreButton, { day }),
      }),
    ),
  );
  const more = container.querySelector("[data-overflow]") as HTMLElement;
  assert.ok(more, "expected a +N more button");
  fireEvent.click(more);
  assert.deepEqual(hidden.sort(), ["B", "C"]);
});

test('eventLimit "auto" falls back to a default limit when no measurement runs', () => {
  const { container } = render(
    h(
      Calendar,
      {
        ...base,
        eventLimit: "auto",
        events: [
          {
            id: "A",
            start: "2026-11-17",
            end: "2026-11-18",
            allDay: true,
            title: "A",
          },
          {
            id: "B",
            start: "2026-11-17",
            end: "2026-11-18",
            allDay: true,
            title: "B",
          },
          {
            id: "C",
            start: "2026-11-17",
            end: "2026-11-18",
            allDay: true,
            title: "C",
          },
          {
            id: "D",
            start: "2026-11-17",
            end: "2026-11-18",
            allDay: true,
            title: "D",
          },
        ] as never,
      },
      h(CalendarMonthGrid, {
        children: (day: any) => h(CalendarMoreButton, { day }),
      }),
    ),
  );
  // Four same-day all-day events exceed the default limit (3), so a "+N more" appears.
  assert.ok(container.querySelector("[data-overflow]"), "expected overflow");
});
