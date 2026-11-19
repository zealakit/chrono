import {
  Calendar,
  CalendarAgenda,
  CalendarAgendaDay,
  CalendarAllDayRow,
  CalendarEvent,
  CalendarEvents,
  CalendarMonthGrid,
  CalendarNextButton,
  CalendarPrevButton,
  CalendarTimeGrid,
  CalendarTimeGridColumnHeader,
  CalendarTimeGridSlot,
  CalendarTitle,
  CalendarTodayButton,
  CalendarViewButton,
  MiniCalendar,
  MiniCalendarGrid,
  MiniCalendarNextButton,
  MiniCalendarPrevButton,
  MiniCalendarTitle,
  type CalendarOptions,
  type MiniCalendarOptions,
} from "../../dist/calendar/index.js";
import { createElement as h, type ReactNode } from "react";

export const VIEWS = [
  "month",
  "week",
  "workWeek",
  "day",
  "agenda",
  "multiMonth",
];

const events = (day: any) =>
  h(CalendarEvents, {
    day,
    children: (segments: any[]) =>
      segments.map((segment: any) =>
        h(CalendarEvent, { key: segment.key, segment }),
      ),
  });

/** The reference composition every adapter renders for the parity scenarios. */
export function referenceCalendar(
  options: CalendarOptions & { children?: ReactNode } = {},
) {
  const { children, ...rest } = options;
  return h(
    Calendar,
    rest,
    h(
      "header",
      null,
      h(CalendarPrevButton),
      h(CalendarTodayButton),
      h(CalendarNextButton),
      h(CalendarTitle),
      ...VIEWS.map((view) => h(CalendarViewButton, { key: view, view })),
    ),
    h(CalendarMonthGrid, { month: 0, children: events }),
    h(CalendarMonthGrid, { month: 1, children: events }),
    h(CalendarMonthGrid, { month: 2, children: events }),
    h(CalendarTimeGrid, {
      children: ({ days, slots }) =>
        h(
          "div",
          { role: "presentation" },
          h(CalendarAllDayRow, {
            children: ({ segments }) =>
              segments.map((segment) =>
                h(CalendarEvent, { key: segment.key, segment }),
              ),
          }),
          h(
            "div",
            { role: "row" },
            ...days.map((day) =>
              h(
                CalendarTimeGridColumnHeader,
                { key: day.key, day },
                day.date.day,
              ),
            ),
          ),
          ...slots.map((slot) =>
            h(
              "div",
              { role: "row", key: slot.index },
              ...days.map((day) =>
                h(CalendarTimeGridSlot, { key: day.key, slot, day }),
              ),
            ),
          ),
          ...days.map((day) => events(day)),
        ),
    }),
    h(CalendarAgenda, {
      children: (days) =>
        days.map((day) =>
          h(CalendarAgendaDay, { key: day.key, day }, events(day)),
        ),
    }),
    children,
  );
}

export function referenceMini(options: MiniCalendarOptions = {}) {
  return h(
    MiniCalendar,
    options,
    h(MiniCalendarPrevButton),
    h(MiniCalendarTitle),
    h(MiniCalendarNextButton),
    h(MiniCalendarGrid),
  );
}
