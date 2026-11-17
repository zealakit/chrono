import type { CalendarDay } from "@zealakit/chrono-core/calendar";
import type { WeekdayHeader } from "@zealakit/chrono-core/foundation";
import { type PropType, defineComponent, h, mergeProps, provide } from "vue";
import { MiniCalendarKey, useMiniCalendarContext } from "./context.js";
import { useMiniCalendar } from "./use-mini-calendar.js";

const dateInput = [String, Date, Object] as PropType<string | Date | object>;

/** A small month calendar, optionally synced with a main `Calendar` through `syncWith`. */
export const MiniCalendar = defineComponent({
  name: "MiniCalendar",
  inheritAttrs: false,
  props: {
    id: String,
    month: Object as PropType<{ year: number; month: number }>,
    defaultMonth: Object as PropType<{ year: number; month: number }>,
    syncWith: Object as PropType<{ date: object; visibleRange: object }>,
    isMarked: Function as PropType<(date: object) => boolean>,
    locale: String,
    weekStartsOn: Number as PropType<1 | 2 | 3 | 4 | 5 | 6 | 7>,
    timeZone: String,
    now: Number,
    min: dateInput,
    max: dateInput,
    weekNumbers: [String, Boolean] as PropType<"iso" | "locale" | false>,
    messages: Object as PropType<Record<string, string>>,
    selectedDate: dateInput,
    highlightedDates: [Array, Function] as PropType<
      unknown[] | ((date: object) => boolean)
    >,
  },
  emits: ["update:month", "navigate"],
  setup(props, { slots, attrs, emit }) {
    const mini = useMiniCalendar(
      () =>
        ({
          ...(props as object),
          weekNumbers: props.weekNumbers || false,
          onMonthChange: (month: object) => emit("update:month", month),
          onNavigate: (date: object) => emit("navigate", date),
        }) as never,
    );
    provide(MiniCalendarKey, mini);
    return () =>
      h(
        "div",
        mergeProps(attrs, { ...mini.getRootProps(), ref: mini.rootRef }),
        slots.default?.(),
      );
  },
});

export const MiniCalendarTitle = defineComponent({
  name: "MiniCalendarTitle",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const mini = useMiniCalendarContext("MiniCalendarTitle");
    return () =>
      h(
        "h2",
        mergeProps(attrs, mini.getTitleProps()),
        slots.default?.() ?? mini.state.value.title.text,
      );
  },
});

function navButton(name: string, kind: "prev" | "next") {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const mini = useMiniCalendarContext(name);
      return () => {
        const props = mini.getNavProps(kind);
        return h(
          "button",
          mergeProps(attrs, props),
          slots.default?.() ?? String(props["aria-label"]),
        );
      };
    },
  });
}

export const MiniCalendarPrevButton = navButton(
  "MiniCalendarPrevButton",
  "prev",
);
export const MiniCalendarNextButton = navButton(
  "MiniCalendarNextButton",
  "next",
);

export const MiniCalendarWeekdayHeader = defineComponent({
  name: "MiniCalendarWeekdayHeader",
  inheritAttrs: false,
  props: {
    header: { type: Object as PropType<WeekdayHeader>, required: true },
  },
  setup(props, { slots, attrs }) {
    const mini = useMiniCalendarContext("MiniCalendarWeekdayHeader");
    return () =>
      h(
        "th",
        mergeProps(attrs, mini.getColumnHeaderProps(props.header)),
        slots.default?.() ?? props.header.short,
      );
  },
});

export const MiniCalendarCell = defineComponent({
  name: "MiniCalendarCell",
  inheritAttrs: false,
  props: { day: { type: Object as PropType<CalendarDay>, required: true } },
  setup(props, { slots, attrs }) {
    const mini = useMiniCalendarContext("MiniCalendarCell");
    return () =>
      h(
        "td",
        mergeProps(attrs, mini.getCellProps(props.day)),
        slots.default?.() ?? String(props.day.date.day),
      );
  },
});

export const MiniCalendarGrid = defineComponent({
  name: "MiniCalendarGrid",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const mini = useMiniCalendarContext("MiniCalendarGrid");
    return () => {
      const { layout } = mini.state.value;
      const model = layout.months[0];
      return h("table", mergeProps(attrs, mini.getGridProps()), [
        h("thead", [
          h("tr", [
            layout.weekNumbers ? h("td") : null,
            ...layout.weekdays.map((header) =>
              h(MiniCalendarWeekdayHeader, { key: header.dayOfWeek, header }),
            ),
          ]),
        ]),
        h(
          "tbody",
          model?.weeks.map((week) =>
            h("tr", { key: week.days[0]?.key }, [
              layout.weekNumbers
                ? h(
                    "th",
                    mini.getWeekNumberProps(week.weekNumber),
                    String(week.weekNumber),
                  )
                : null,
              ...week.days.map((d) =>
                h(
                  MiniCalendarCell,
                  { key: d.key, day: d },
                  slots.default ? () => slots.default?.({ day: d }) : undefined,
                ),
              ),
            ]),
          ),
        ),
      ]);
    };
  },
});
