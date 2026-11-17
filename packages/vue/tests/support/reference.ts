import { type PropType, defineComponent, h } from "vue";
import {
  Calendar,
  CalendarAgenda,
  CalendarAgendaDay,
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
        h(CalendarMonthGrid, { month: 0 }),
        h(CalendarMonthGrid, { month: 1 }),
        h(CalendarMonthGrid, { month: 2 }),
        h(CalendarTimeGrid, null, {
          default: ({ days, slots }: { days: any[]; slots: any[] }) =>
            h("div", { role: "presentation" }, [
              h(
                "div",
                { role: "row" },
                days.map((day) =>
                  h(CalendarTimeGridColumnHeader, { key: day.key, day }, () =>
                    String(day.date.day),
                  ),
                ),
              ),
              ...slots.map((slot) =>
                h(
                  "div",
                  { role: "row", key: slot.index },
                  days.map((day) =>
                    h(CalendarTimeGridSlot, { key: day.key, slot, day }),
                  ),
                ),
              ),
            ]),
        }),
        h(CalendarAgenda, null, {
          default: ({ days }: { days: any[] }) =>
            days.map((day) =>
              h(CalendarAgendaDay, { key: day.key, day }, () =>
                String(day.date.day),
              ),
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
