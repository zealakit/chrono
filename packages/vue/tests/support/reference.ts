import { type PropType, defineComponent, h } from "vue";
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
} from "../../dist/calendar/index.js";

export const VIEWS = [
  "month",
  "week",
  "workWeek",
  "day",
  "agenda",
  "multiMonth",
];

// Biome disables `noExplicitAny` in tests; the parity composition is structural.
const events = (day: any) =>
  h(
    CalendarEvents,
    { day },
    {
      default: ({ segments }: { segments: any[] }) =>
        segments.map((segment: any) =>
          h(CalendarEvent, { key: segment.key, segment }),
        ),
    },
  );

/** The reference composition every adapter renders for the parity scenarios. */
export const ReferenceCalendar = defineComponent({
  props: {
    options: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
  },
  setup(props, { attrs }) {
    return () =>
      h(Calendar, { ...props.options, ...attrs }, () => [
        h("header", [
          h(CalendarPrevButton),
          h(CalendarTodayButton),
          h(CalendarNextButton),
          h(CalendarTitle),
          ...VIEWS.map((view) => h(CalendarViewButton, { key: view, view })),
        ]),
        h(
          CalendarMonthGrid,
          { month: 0 },
          { default: ({ day }: any) => events(day) },
        ),
        h(
          CalendarMonthGrid,
          { month: 1 },
          { default: ({ day }: any) => events(day) },
        ),
        h(
          CalendarMonthGrid,
          { month: 2 },
          { default: ({ day }: any) => events(day) },
        ),
        h(CalendarTimeGrid, null, {
          default: ({ days, slots }: { days: any[]; slots: any[] }) =>
            h("div", { role: "presentation" }, [
              h(CalendarAllDayRow, null, {
                default: ({ segments }: { segments: any[] }) =>
                  segments.map((segment: any) =>
                    h(CalendarEvent, { key: segment.key, segment }),
                  ),
              }),
              h(
                "div",
                { role: "row" },
                days.map((day: any) =>
                  h(CalendarTimeGridColumnHeader, { key: day.key, day }, () =>
                    String(day.date.day),
                  ),
                ),
              ),
              ...slots.map((slot: any) =>
                h(
                  "div",
                  { role: "row", key: slot.index },
                  days.map((day: any) =>
                    h(CalendarTimeGridSlot, { key: day.key, slot, day }),
                  ),
                ),
              ),
              ...days.map((day: any) => events(day)),
            ]),
        }),
        h(CalendarAgenda, null, {
          default: ({ days }: { days: any[] }) =>
            days.map((day: any) =>
              h(CalendarAgendaDay, { key: day.key, day }, () => events(day)),
            ),
        }),
      ]);
  },
});

export const ReferenceMini = defineComponent({
  props: {
    options: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
  },
  setup(props, { attrs }) {
    return () =>
      h(MiniCalendar, { ...props.options, ...attrs }, () => [
        h(MiniCalendarPrevButton),
        h(MiniCalendarTitle),
        h(MiniCalendarNextButton),
        h(MiniCalendarGrid),
      ]);
  },
});
