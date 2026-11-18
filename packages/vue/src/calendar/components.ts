import type {
  BackgroundMode,
  CalendarAvailabilityInput,
  CalendarDay,
  ResourceColumn,
  ResourceGrouping,
  ResourceGroupHeader,
  ResourceInput,
  ResourcePieceLike,
  TimelineHeaderCell,
  TimelineRow,
  TimelineSlot,
  WindowRange,
  CalendarEventInput,
  CalendarMessages,
  CustomViews,
  EventChangeProposal,
  SelectionProposal,
  TimeGridOptions,
  RecurrencePack,
  RRuleError,
} from "@zealakit/chrono-core/calendar";
import type {
  AvailabilityRule,
  AvailabilitySpec,
  DateInput,
  DayOfWeek,
  PlainDate,
  TimeSlot,
  WeekdayHeader,
} from "@zealakit/chrono-core/foundation";
import {
  type PropType,
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
} from "vue";
import { CalendarKey, useCalendarContext } from "./context.js";
import { type EventSegment, useCalendar } from "./use-calendar.js";

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
  events: Array as PropType<readonly CalendarEventInput[]>,
  recurrence: Object as PropType<RecurrencePack>,
  onRecurrenceError: Function as PropType<
    (event: CalendarEventInput, error: RRuleError) => void
  >,
  eventLimit: [Number, String] as PropType<number | "auto">,
  allDayEventLimit: Number,
  minEventDuration: Number,
  longEventsInAllDayRow: Boolean,
  selectedEventId: [String, Number] as PropType<string | number | null>,
  defaultSelectedEventId: [String, Number] as PropType<string | number | null>,
  getEventLabel: Function as PropType<(event: CalendarEventInput) => string>,
  selectable: Boolean,
  maxSelectionDuration: Number,
  validateSelection: Function as PropType<
    (proposal: SelectionProposal) => boolean
  >,
  hitTest: Function as PropType<
    (point: { x: number; y: number }) => { cellKey: string } | null
  >,
  announcer: [Object, Boolean] as PropType<HTMLElement | false>,
  editable: Boolean,
  isEventEditable: Function as PropType<(event: CalendarEventInput) => boolean>,
  snapDuration: Number,
  allowAllDayConversion: { type: Boolean, default: undefined },
  defaultTimedDuration: Number,
  /** A prop, not an emit: the return value (`false`, a promise) is the app's verdict (plan 09 R5). */
  onEventChange: Function as PropType<
    (proposal: EventChangeProposal) => void | boolean | Promise<boolean>
  >,
  validateEventChange: Function as PropType<
    (proposal: EventChangeProposal) => boolean
  >,
  pendingTimeout: Number,
  resources: Array as PropType<readonly ResourceInput[]>,
  getResourceLabel: Function as PropType<(resource: ResourceInput) => string>,
  resourceGrouping: String as PropType<ResourceGrouping>,
  collapsedResourceIds: Array as PropType<readonly (string | number)[]>,
  defaultCollapsedResourceIds: Array as PropType<readonly (string | number)[]>,
  zoomLevels: Array as PropType<readonly string[]>,
  resourceWindow: Object as PropType<WindowRange>,
  slotWindow: Object as PropType<WindowRange>,
  availability: [Object, Function] as PropType<CalendarAvailabilityInput>,
  backgrounds: [String, Boolean] as PropType<BackgroundMode>,
  availabilityBlocksInteraction: { type: Boolean, default: undefined },
  getResourceAvailability: Function as PropType<
    (resource: ResourceInput) => AvailabilitySpec
  >,
  getAvailabilityLabel: Function as PropType<
    (rules: readonly AvailabilityRule[]) => string
  >,
  autoScroll: { type: Boolean, default: undefined },
  scrollContainer: Object as PropType<HTMLElement>,
  keyboardShortcuts: {
    type: [Object, Boolean] as PropType<
      false | { move?: string; resizeEnd?: string; resizeStart?: string }
    >,
    default: undefined,
  },
} as const;

/** Creates the calendar. Use `v-model:view` and `v-model:date`, or the `default-*` props. */
export const Calendar = defineComponent({
  name: "Calendar",
  inheritAttrs: false,
  props: calendarProps,
  emits: [
    "update:view",
    "update:date",
    "visibleRangeChange",
    "dateActivate",
    "update:selectedEventId",
    "update:collapsedResourceIds",
    "selectedEventChange",
    "eventActivate",
    "moreActivate",
    "selectRange",
    "selectionChange",
  ],
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
          onSelectedEventChange: (
            id: string | number | null,
            event: unknown,
          ) => {
            emit("update:selectedEventId", id);
            emit("selectedEventChange", id, event);
          },
          onEventActivate: (event: unknown, info: object) =>
            emit("eventActivate", event, info),
          onMoreActivate: (date: object, events: unknown[]) =>
            emit("moreActivate", date, events),
          onCollapsedResourceIdsChange: (ids: readonly (string | number)[]) =>
            emit("update:collapsedResourceIds", ids),
          onSelectRange: (proposal: object) => emit("selectRange", proposal),
          onSelectionChange: (selection: object) =>
            emit("selectionChange", selection),
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
    const tableRef = ref<HTMLElement | null>(null);
    let observer: ResizeObserver | undefined;

    // `eventLimit: "auto"` measures the first cell and first event, then sets
    // the limit (plan 05 §3.1). Browser-only; SSR / no ResizeObserver keeps 3.
    onMounted(() => {
      if (props.month !== 0) return;
      if (calendar.controller.getEventLimit() !== "auto") return;
      const table = tableRef.value;
      if (!table || typeof ResizeObserver === "undefined") return;
      const measure = (): void => {
        const cell = table.querySelector('td[role="gridcell"]');
        const event = table.querySelector("[data-chrono-event]");
        if (!cell || !event) return;
        const cellHeight = (cell as HTMLElement).clientHeight;
        const eventHeight = (event as HTMLElement).offsetHeight;
        if (cellHeight > 0 && eventHeight > 0) {
          calendar.controller.setEventLimit(
            Math.max(1, Math.floor(cellHeight / eventHeight)),
          );
        }
      };
      measure();
      observer = new ResizeObserver(measure);
      observer.observe(table);
    });
    onBeforeUnmount(() => observer?.disconnect());

    return () => {
      const { layout } = calendar.state.value;
      const model =
        layout.kind === "month" ? layout.months[props.month] : undefined;
      if (layout.kind !== "month" || !model) return null;
      return h(
        "table",
        mergeProps(attrs, {
          ...calendar.getGridProps(props.month),
          ref: tableRef,
        }),
        [
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
        ],
      );
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

// ---- Events (plan 05 §3.1) ----

/** The event list of one cell (E11). The default scoped slot receives `{ segments }`. */
export const CalendarEvents = defineComponent({
  name: "CalendarEvents",
  inheritAttrs: false,
  props: { day },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarEvents");
    return () => {
      const state = calendar.state.value;
      const segments = calendar.controller.getCellEventSegments(props.day);
      const interacting =
        state.focus.mode === "interaction" &&
        state.focus.cellKey === props.day.key;
      return h(
        "div",
        mergeProps(attrs, {
          role: "group",
          "aria-label": state.messages.events,
          "data-interacting": interacting ? "" : undefined,
        }),
        slots.default?.({ segments }),
      );
    };
  },
});

/** One event segment. The default slot renders the app's content. */
export const CalendarEvent = defineComponent({
  name: "CalendarEvent",
  inheritAttrs: false,
  props: {
    segment: { type: Object as PropType<EventSegment>, required: true },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarEvent");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getEventProps(props.segment)),
        slots.default?.(),
      );
  },
});

/** A resize handle inside an event. Style and position it in your CSS. */
export const CalendarEventResizeHandle = defineComponent({
  name: "CalendarEventResizeHandle",
  inheritAttrs: false,
  props: {
    segment: { type: Object as PropType<EventSegment>, required: true },
    edge: { type: String as PropType<"start" | "end">, required: true },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarEventResizeHandle");
    return () =>
      h(
        "div",
        mergeProps(
          attrs,
          calendar.getResizeHandleProps(props.segment, props.edge),
        ),
        slots.default?.(),
      );
  },
});

/** The drag preview of one cell: one element per preview piece, `aria-hidden`. */
export const CalendarEventDragPreview = defineComponent({
  name: "CalendarEventDragPreview",
  inheritAttrs: false,
  props: { day, allDay: Boolean },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarEventDragPreview");
    return () =>
      calendar.getDragPreviewPieces(props.day, props.allDay).map((piece) =>
        h(
          "div",
          {
            key: piece.key,
            ...mergeProps(attrs, calendar.getDragPreviewProps(piece)),
          },
          slots.default?.({ piece }),
        ),
      );
  },
});

const resourceRow = {
  type: Object as PropType<TimelineRow>,
  required: true,
} as const;

/** A resource time grid column header (a resource on a day). */
export const CalendarResourceHeader = defineComponent({
  name: "CalendarResourceHeader",
  inheritAttrs: false,
  props: {
    column: { type: Object as PropType<ResourceColumn>, required: true },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarResourceHeader");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getResourceHeaderProps(props.column)),
        slots.default?.() ?? props.column.label,
      );
  },
});

/** A group header spanning the columns of the resources below it. */
export const CalendarResourceGroupHeader = defineComponent({
  name: "CalendarResourceGroupHeader",
  inheritAttrs: false,
  props: {
    group: { type: Object as PropType<ResourceGroupHeader>, required: true },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarResourceGroupHeader");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getResourceGroupHeaderProps(props.group)),
        slots.default?.() ?? props.group.label,
      );
  },
});

/** The resource time grid root; the slot receives `{ layout }`. Renders only in a resource day or week view. */
export const CalendarResourceGrid = defineComponent({
  name: "CalendarResourceGrid",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarResourceGrid");
    return () => {
      const layout = calendar.state.value.resources;
      if (!layout || layout.kind !== "resource-time-grid") return null;
      return h(
        "div",
        mergeProps(attrs, { role: "grid" }),
        slots.default?.({ layout }),
      );
    };
  },
});

/** The timeline root: `grid`, or `treegrid` when grouped; the slot receives `{ layout }`. */
export const CalendarTimeline = defineComponent({
  name: "CalendarTimeline",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimeline");
    return () => {
      const layout = calendar.state.value.resources;
      if (!layout || layout.kind !== "timeline") return null;
      return h(
        "div",
        mergeProps(attrs, calendar.getTimelineProps()),
        slots.default?.({ layout }),
      );
    };
  },
});

/** One cell of a timeline header row; `aria-colspan` is its slot span. */
export const CalendarTimelineHeaderCell = defineComponent({
  name: "CalendarTimelineHeaderCell",
  inheritAttrs: false,
  props: {
    cell: { type: Object as PropType<TimelineHeaderCell>, required: true },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimelineHeaderCell");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getTimelineHeaderCellProps(props.cell)),
        slots.default?.() ?? props.cell.label,
      );
  },
});

/** One resource or group row; carries `--chrono-row-lanes`. */
export const CalendarTimelineRow = defineComponent({
  name: "CalendarTimelineRow",
  inheritAttrs: false,
  props: { row: resourceRow },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimelineRow");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getTimelineRowProps(props.row)),
        slots.default?.(),
      );
  },
});

/** The row header; clicking a group header collapses or expands it. */
export const CalendarTimelineRowHeader = defineComponent({
  name: "CalendarTimelineRowHeader",
  inheritAttrs: false,
  props: { row: resourceRow },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimelineRowHeader");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getTimelineRowHeaderProps(props.row)),
        slots.default?.() ?? props.row.label,
      );
  },
});

/** One slot of a row. */
export const CalendarTimelineCell = defineComponent({
  name: "CalendarTimelineCell",
  inheritAttrs: false,
  props: {
    row: resourceRow,
    slot: { type: Object as PropType<TimelineSlot>, required: true },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarTimelineCell");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getTimelineCellProps(props.row, props.slot)),
        slots.default?.(),
      );
  },
});

/** One event piece of a resource view, with positions as `--chrono-event-*` properties. */
export const CalendarResourceEvent = defineComponent({
  name: "CalendarResourceEvent",
  inheritAttrs: false,
  props: {
    piece: {
      type: Object as PropType<ResourcePieceLike<CalendarEventInput>>,
      required: true,
    },
  },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarResourceEvent");
    return () =>
      h(
        "div",
        mergeProps(attrs, calendar.getResourcePieceProps(props.piece)),
        slots.default?.(),
      );
  },
});

/** The "+N more" control of an overflowing day (E22). Renders nothing without overflow. */
export const CalendarMoreButton = defineComponent({
  name: "CalendarMoreButton",
  inheritAttrs: false,
  props: { day },
  setup(props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarMoreButton");
    return () => {
      const overflow = calendar.state.value.more.find(
        (m) => m.dayKey === props.day.key,
      );
      if (!overflow) return null;
      return h(
        "button",
        mergeProps(attrs, calendar.getMoreProps(props.day)),
        slots.default?.() ?? `+${overflow.count} more`,
      );
    };
  },
});

/** The time-grid all-day row. The default scoped slot receives `{ days, segments }`. */
export const CalendarAllDayRow = defineComponent({
  name: "CalendarAllDayRow",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const calendar = useCalendarContext("CalendarAllDayRow");
    return () => {
      const { layout, allDayRow } = calendar.state.value;
      if (layout.kind !== "time-grid") return null;
      return h(
        "div",
        mergeProps(attrs, {}),
        slots.default?.({ days: layout.days, segments: allDayRow }),
      );
    };
  },
});

/** The now-indicator line. Renders nothing when the indicator is out of view. */
export const CalendarNowIndicator = defineComponent({
  name: "CalendarNowIndicator",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const calendar = useCalendarContext("CalendarNowIndicator");
    return () => {
      if (!calendar.state.value.nowIndicator) return null;
      return h("div", mergeProps(attrs, calendar.getNowIndicatorProps()));
    };
  },
});

/** One availability background piece (plan 11 V9). */
export const CalendarBackground = defineComponent({
  name: "CalendarBackground",
  inheritAttrs: false,
  props: { piece: { type: Object as PropType<unknown>, required: true } },
  setup(props, { attrs, slots }) {
    const calendar = useCalendarContext("CalendarBackground");
    return () =>
      h(
        "div",
        mergeProps(
          attrs,
          calendar.getBackgroundProps(
            props.piece as import("@zealakit/chrono-core/calendar").BackgroundPiece,
          ),
        ),
        slots.default?.({ piece: props.piece }),
      );
  },
});

/** A selection preview piece for one covered day. */
export const CalendarSelectionPreview = defineComponent({
  name: "CalendarSelectionPreview",
  inheritAttrs: false,
  props: { day },
  setup(props, { attrs }) {
    const calendar = useCalendarContext("CalendarSelectionPreview");
    return () => {
      const preview = calendar.getSelectionPreviewProps(props.day);
      if (Object.keys(preview).length === 0) return null;
      return h("div", mergeProps(attrs, preview));
    };
  },
});
