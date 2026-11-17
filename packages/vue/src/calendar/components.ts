import type {
  CalendarDay,
  CalendarMessages,
  CustomViews,
  TimeGridOptions,
} from "@zealakit/chrono-core/calendar";
import type {
  DateInput,
  DayOfWeek,
  PlainDate,
  TimeSlot,
  WeekdayHeader,
} from "@zealakit/chrono-core/foundation";
import { type PropType, defineComponent, h, mergeProps, provide } from "vue";
import { CalendarKey, useCalendarContext } from "./context.js";
import { useCalendar } from "./use-calendar.js";

const dateInput = [String, Date, Object] as PropType<DateInput>;
const day = { type: Object as PropType<CalendarDay>, required: true } as const;

const calendarProps = {
  id: String,
  view: String,
  defaultView: String,
  date: dateInput,
  defaultDate: dateInput,
  views: Object as PropType<CustomViews>,
  locale: String,
  weekStartsOn: Number as PropType<DayOfWeek>,
  hiddenDays: Array as PropType<DayOfWeek[]>,
  timeZone: String,
  now: Number,
  min: dateInput,
  max: dateInput,
  timeGrid: Object as PropType<TimeGridOptions>,
  weekNumbers: [String, Boolean] as PropType<"iso" | "locale" | false>,
  messages: Object as PropType<Partial<CalendarMessages>>,
  selectedDate: dateInput,
  highlightedDates: [Array, Function] as PropType<
    readonly DateInput[] | ((date: PlainDate) => boolean)
  >,
} as const;

/** Creates the calendar. Use `v-model:view` and `v-model:date`, or the `default-*` props. */
export const Calendar = defineComponent({
  name: "Calendar",
  inheritAttrs: false,
  props: calendarProps,
  emits: ["update:view", "update:date", "visibleRangeChange", "dateActivate"],
  setup(props, { slots, attrs, emit }) {
    const calendar = useCalendar(
      () =>
        ({
          ...(props as object),
          weekNumbers: props.weekNumbers || false,
          onViewChange: (view: string) => emit("update:view", view),
          onDateChange: (date: object) => emit("update:date", date),
          onVisibleRangeChange: (range: object, info: object) =>
            emit("visibleRangeChange", range, info),
          onDateActivate: (date: object, info: object) =>
            emit("dateActivate", date, info),
        }) as never,
    );
    provide(CalendarKey, calendar);
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          ...calendar.getRootProps(),
          ref: calendar.rootRef,
        }),
        slots.default?.(),
      );
  },
});

export const CalendarTitle = defineComponent({
  name: "CalendarTitle",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTitle");
    return () => {
      const { title } = calendar.state.value;
      return h(
        "h2",
        mergeProps(attrs, calendar.getTitleProps()),
        slots.default ? slots.default({ title }) : title.text,
      );
    };
  },
});

function navButton(name: string, kind: "prev" | "next" | "today") {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const calendar = useCalendarContext(name);
      return () => {
        const props = calendar.getNavProps(kind);
        return h(
          "button",
          mergeProps(attrs, props),
          slots.default?.() ?? String(props["aria-label"]),
        );
      };
    },
  });
}

export const CalendarPrevButton = navButton("CalendarPrevButton", "prev");
export const CalendarNextButton = navButton("CalendarNextButton", "next");
export const CalendarTodayButton = navButton("CalendarTodayButton", "today");

export const CalendarViewButton = defineComponent({
  name: "CalendarViewButton",
  inheritAttrs: false,
  props: { view: { type: String, required: true } },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarViewButton");
    return () =>
      h(
        "button",
        mergeProps(attrs, calendar.getViewButtonProps(props.view)),
        slots.default?.() ?? props.view,
      );
  },
});

export const CalendarWeekdayHeader = defineComponent({
  name: "CalendarWeekdayHeader",
  inheritAttrs: false,
  props: {
    header: { type: Object as PropType<WeekdayHeader>, required: true },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarWeekdayHeader");
    return () =>
      h(
        "th",
        mergeProps(attrs, calendar.getColumnHeaderProps(props.header)),
        slots.default?.() ?? props.header.short,
      );
  },
});

export const CalendarWeekNumber = defineComponent({
  name: "CalendarWeekNumber",
  inheritAttrs: false,
  props: { weekNumber: { type: Number, required: true } },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarWeekNumber");
    return () =>
      h(
        "th",
        mergeProps(attrs, calendar.getWeekNumberProps(props.weekNumber)),
        slots.default?.() ?? String(props.weekNumber),
      );
  },
});

export const CalendarCell = defineComponent({
  name: "CalendarCell",
  inheritAttrs: false,
  props: { day },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarCell");
    return () =>
      h(
        "td",
        mergeProps(attrs, calendar.getCellProps(props.day)),
        slots.default?.() ?? String(props.day.date.day),
      );
  },
});

/** A month grid. The default scoped slot receives `{ day }` for each cell's content. */
export const CalendarMonthGrid = defineComponent({
  name: "CalendarMonthGrid",
  inheritAttrs: false,
  props: { month: { type: Number, default: 0 } },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarMonthGrid");
    return () => {
      const { layout } = calendar.state.value;
      const model =
        layout.kind === "month" ? layout.months[props.month] : undefined;
      if (layout.kind !== "month" || !model) return null;
      return h("table", mergeProps(attrs, calendar.getGridProps(props.month)), [
        h("thead", [
          h("tr", [
            layout.weekNumbers ? h("td") : null,
            ...layout.weekdays.map((header) =>
              h(CalendarWeekdayHeader, { key: header.dayOfWeek, header }),
            ),
          ]),
        ]),
        h(
          "tbody",
          model.weeks.map((week) =>
            h("tr", { key: week.days[0]?.key }, [
              layout.weekNumbers
                ? h(CalendarWeekNumber, { weekNumber: week.weekNumber })
                : null,
              ...week.days
                .filter((d) => !d.hidden)
                .map((d) =>
                  h(
                    CalendarCell,
                    { key: d.key, day: d },
                    slots.default
                      ? () => slots.default?.({ day: d })
                      : undefined,
                  ),
                ),
            ]),
          ),
        ),
      ]);
    };
  },
});

export const CalendarTimeGrid = defineComponent({
  name: "CalendarTimeGrid",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimeGrid");
    return () => {
      const { layout } = calendar.state.value;
      if (layout.kind !== "time-grid") return null;
      return h(
        "div",
        mergeProps(attrs, calendar.getTimeGridProps()),
        slots.default?.({ days: layout.days, slots: layout.slots }),
      );
    };
  },
});

export const CalendarTimeGridColumnHeader = defineComponent({
  name: "CalendarTimeGridColumnHeader",
  inheritAttrs: false,
  props: { day },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimeGridColumnHeader");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getColumnHeaderProps(props.day)),
        slots.default?.() ?? String(props.day.date.day),
      );
  },
});

export const CalendarTimeGridSlot = defineComponent({
  name: "CalendarTimeGridSlot",
  inheritAttrs: false,
  props: { slot: { type: Object as PropType<TimeSlot>, required: true }, day },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimeGridSlot");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getSlotProps(props.slot, props.day)),
        slots.default?.(),
      );
  },
});

export const CalendarAgenda = defineComponent({
  name: "CalendarAgenda",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarAgenda");
    return () => {
      const { layout } = calendar.state.value;
      if (layout.kind !== "list") return null;
      return h(
        "ul",
        mergeProps(attrs, calendar.getAgendaProps()),
        slots.default?.({ days: layout.days }),
      );
    };
  },
});

export const CalendarAgendaDay = defineComponent({
  name: "CalendarAgendaDay",
  inheritAttrs: false,
  props: { day },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarAgendaDay");
    return () =>
      h(
        "li",
        mergeProps(attrs, calendar.getAgendaDayProps(props.day)),
        slots.default?.() ?? props.day.key,
      );
  },
});
