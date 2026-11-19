import type {
  PanelCell,
  PanelDay,
  SegmentView,
} from "@zealakit/chrono-core/date";
import type {
  DateInput as DateInputValue,
  DayOfWeek,
  PlainDate,
  WeekdayHeader,
} from "@zealakit/chrono-core/foundation";
import {
  type PropType,
  type VNodeChild,
  defineComponent,
  h,
  mergeProps,
  provide,
} from "vue";
import {
  DateFieldKey,
  DatePanelKey,
  DateRangeKey,
  useDateFieldContext,
  useDatePanelContext,
  useDateRangeContext,
} from "./context.js";
import { useDateInput, useDateRangeInput } from "./use-date-input.js";
import {
  useDatePanel,
  useDateRangePanel,
  useMultiDatePanel,
} from "./use-date-panel.js";

const dateInput = [String, Date, Object] as PropType<DateInputValue>;
const bool = { type: Boolean, default: undefined } as const;
const fn = <T>() => Function as PropType<T>;
type Month = { year: number; month: number };

const baseProps = {
  id: String,
  value: null as unknown as PropType<unknown>,
  defaultValue: null as unknown as PropType<unknown>,
  min: dateInput,
  max: dateInput,
  isDateDisabled: fn<(date: PlainDate) => boolean>(),
  isDateUnavailable: fn<(date: PlainDate) => boolean>(),
  locale: String,
  timeZone: String,
  now: Number,
  messages: Object as PropType<Record<string, string>>,
  readOnly: bool,
  disabled: bool,
};

const panelProps = {
  ...baseProps,
  visibleMonth: Object as PropType<Month>,
  defaultVisibleMonth: Object as PropType<Month>,
  level: String as PropType<"day" | "month" | "year">,
  defaultLevel: String as PropType<"day" | "month" | "year">,
  minLevel: String as PropType<"day" | "month" | "year">,
  maxLevel: String as PropType<"day" | "month" | "year">,
  months: Number,
  pageBy: String as PropType<"month" | "visible">,
  followValue: bool,
  autoFocus: bool,
  weekStartsOn: Number as PropType<DayOfWeek>,
  weekNumbers: [String, Boolean] as PropType<"iso" | "locale" | false>,
  selectToday: bool,
} as const;

const rangePanelProps = {
  ...panelProps,
  minDays: [Number, Function] as PropType<
    number | ((start: PlainDate) => number)
  >,
  maxDays: [Number, Function] as PropType<
    number | ((start: PlainDate) => number)
  >,
  allowUnavailableInside: bool,
  allowDisabledInside: bool,
} as const;

const multiPanelProps = {
  ...panelProps,
  maxSelected: Number,
} as const;

const inputProps = {
  ...baseProps,
  mode: String as PropType<"segmented" | "text">,
  placeholderValue: dateInput,
  parse: fn<(text: string, context: object) => PlainDate | null>(),
  format: fn<(date: PlainDate, context: object) => string>(),
  name: String,
  required: bool,
} as const;

const rangeInputProps = {
  ...inputProps,
  startName: String,
  endName: String,
  minDays: [Number, Function] as PropType<
    number | ((start: PlainDate) => number)
  >,
  maxDays: [Number, Function] as PropType<
    number | ((start: PlainDate) => number)
  >,
  allowUnavailableInside: bool,
  allowDisabledInside: bool,
} as const;

/** Drop `undefined` props so the controller sees them as not passed. */
function defined(props: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  );
}

type Emit = (event: string, ...args: unknown[]) => void;

const panelCallbacks = (emit: Emit) => ({
  onValueChange: (value: unknown) => emit("update:value", value),
  onValueCommit: (value: unknown) => emit("valueCommit", value),
  onVisibleMonthChange: (month: object) => emit("update:visibleMonth", month),
  onLevelChange: (level: string) => emit("update:level", level),
});

const PANEL_EMITS = [
  "update:value",
  "valueCommit",
  "update:visibleMonth",
  "update:level",
];

const weekNumbersOf = (props: { weekNumbers?: unknown }) =>
  props.weekNumbers === undefined ? undefined : props.weekNumbers || false;

// ---------------------------------------------------------------- inputs

/** The default content of a field: segments, or the text field. */
function fieldContent() {
  const field = useDateFieldContext("DateInput");
  const { state } = field;
  return (): VNodeChild => {
    if (state.value.mode === "text") return h(DateInputTextField);
    return state.value.segments.map((segment, index) =>
      segment.type === "literal"
        ? h(DateInputLiteral, { key: index, segment })
        : h(DateInputSegment, { key: segment.type, segment }),
    );
  };
}

const FieldContent = defineComponent({
  name: "DateInputContent",
  setup() {
    const render = fieldContent();
    return () => render();
  },
});

const hidden = (inputs: { name: string; value: string }[]) =>
  inputs.map((input) =>
    h("input", {
      key: `${input.name}:${input.value}`,
      type: "hidden",
      name: input.name,
      value: input.value,
    }),
  );

export const DateInputSegment = defineComponent({
  name: "DateInputSegment",
  inheritAttrs: false,
  props: { segment: { type: Object as PropType<SegmentView>, required: true } },
  setup(props, { slots, attrs }) {
    const field = useDateFieldContext("DateInputSegment");
    return () =>
      h(
        "span",
        mergeProps(attrs, field.getSegmentProps(props.segment)),
        slots.default?.(props.segment) ?? props.segment.text,
      );
  },
});

export const DateInputLiteral = defineComponent({
  name: "DateInputLiteral",
  inheritAttrs: false,
  props: { segment: { type: Object as PropType<SegmentView>, required: true } },
  setup(props, { slots, attrs }) {
    const field = useDateFieldContext("DateInputLiteral");
    return () =>
      h(
        "span",
        mergeProps(attrs, field.getSegmentProps(props.segment)),
        slots.default?.() ?? props.segment.text,
      );
  },
});

export const DateInputTextField = defineComponent({
  name: "DateInputTextField",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const field = useDateFieldContext("DateInputTextField");
    return () => h("input", mergeProps(attrs, field.getTextFieldProps()));
  },
});

export const DateInputClearButton = defineComponent({
  name: "DateInputClearButton",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const field = useDateFieldContext("DateInputClearButton");
    return () => {
      const props = field.getClearButtonProps();
      return h(
        "button",
        mergeProps(attrs, props),
        slots.default?.() ?? String(props["aria-label"]),
      );
    };
  },
});

/** A date field: segmented (default) or text. */
export const DateInput = defineComponent({
  name: "DateInput",
  inheritAttrs: false,
  props: inputProps,
  emits: ["update:value", "valueCommit", "invalidInput"],
  setup(props, { slots, attrs, emit }) {
    const field = useDateInput(
      () =>
        ({
          ...defined(props),
          onValueChange: (value: unknown) => emit("update:value", value),
          onValueCommit: (value: unknown) => emit("valueCommit", value),
          onInvalidInput: (text: string) => emit("invalidInput", text),
        }) as never,
    );
    provide(DateFieldKey, field);
    return () =>
      h(
        "div",
        mergeProps(attrs, { ...field.getRootProps(), ref: field.rootRef }),
        [
          slots.default ? slots.default(field.state.value) : h(FieldContent),
          ...hidden(field.state.value.hidden),
        ],
      );
  },
});

function rangeField(name: string, side: "start" | "end") {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const range = useDateRangeContext(name);
      const field = range[side];
      provide(DateFieldKey, field);
      return () =>
        h(
          "div",
          mergeProps(attrs, {
            ...field.getRootProps(),
            role: "group",
            "aria-label":
              field.state.value.messages[
                side === "start" ? "startDate" : "endDate"
              ],
            ref: field.rootRef,
          }),
          slots.default ? slots.default(field.state.value) : h(FieldContent),
        );
    },
  });
}

export const DateRangeInputStart = rangeField("DateRangeInputStart", "start");
export const DateRangeInputEnd = rangeField("DateRangeInputEnd", "end");

/** Two date fields (start and end) in one group, in both modes. */
export const DateRangeInput = defineComponent({
  name: "DateRangeInput",
  inheritAttrs: false,
  props: rangeInputProps,
  emits: ["update:value", "valueCommit", "invalidInput"],
  setup(props, { slots, attrs, emit }) {
    const range = useDateRangeInput(
      () =>
        ({
          ...defined(props),
          onValueChange: (value: unknown) => emit("update:value", value),
          onValueCommit: (value: unknown) => emit("valueCommit", value),
          onInvalidInput: (text: string) => emit("invalidInput", text),
        }) as never,
    );
    provide(DateRangeKey, range);
    return () =>
      h("div", mergeProps(attrs, range.getRootProps()), [
        slots.default
          ? slots.default()
          : [
              h(DateRangeInputStart),
              h("span", { "aria-hidden": "true" }, "–"),
              h(DateRangeInputEnd),
            ],
        ...hidden(range.state.value.hidden),
      ]);
  },
});

// ---------------------------------------------------------------- panels

export const DatePanelTitle = defineComponent({
  name: "DatePanelTitle",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const panel = useDatePanelContext("DatePanelTitle");
    return () =>
      h(
        "h2",
        mergeProps(attrs, panel.getTitleProps()),
        slots.default?.() ?? panel.state.value.title,
      );
  },
});

export const DatePanelLevelButton = defineComponent({
  name: "DatePanelLevelButton",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const panel = useDatePanelContext("DatePanelLevelButton");
    return () =>
      h(
        "button",
        mergeProps(attrs, panel.getLevelButtonProps()),
        slots.default?.() ?? panel.state.value.title,
      );
  },
});

function navButton(name: string, kind: "prev" | "next") {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const panel = useDatePanelContext(name);
      return () => {
        const props = panel.getNavProps(kind);
        return h(
          "button",
          mergeProps(attrs, props),
          slots.default?.() ?? String(props["aria-label"]),
        );
      };
    },
  });
}

export const DatePanelPrevButton = navButton("DatePanelPrevButton", "prev");
export const DatePanelNextButton = navButton("DatePanelNextButton", "next");

export const DatePanelTodayButton = defineComponent({
  name: "DatePanelTodayButton",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const panel = useDatePanelContext("DatePanelTodayButton");
    return () => {
      const props = panel.getTodayButtonProps();
      return h(
        "button",
        mergeProps(attrs, props),
        slots.default?.() ?? String(props["aria-label"]),
      );
    };
  },
});

export const DatePanelWeekdayHeader = defineComponent({
  name: "DatePanelWeekdayHeader",
  inheritAttrs: false,
  props: {
    header: { type: Object as PropType<WeekdayHeader>, required: true },
  },
  setup(props, { slots, attrs }) {
    const panel = useDatePanelContext("DatePanelWeekdayHeader");
    return () =>
      h(
        "th",
        mergeProps(attrs, panel.getColumnHeaderProps(props.header)),
        slots.default?.() ?? props.header.short,
      );
  },
});

export const DatePanelWeekNumber = defineComponent({
  name: "DatePanelWeekNumber",
  inheritAttrs: false,
  props: { weekNumber: { type: Number, required: true } },
  setup(props, { slots, attrs }) {
    const panel = useDatePanelContext("DatePanelWeekNumber");
    return () =>
      h(
        "th",
        mergeProps(attrs, panel.getWeekNumberProps(props.weekNumber)),
        slots.default?.() ?? String(props.weekNumber),
      );
  },
});

/** A day cell (`day`) or, at the month and year levels, a month or year cell (`cell`). */
export const DatePanelCell = defineComponent({
  name: "DatePanelCell",
  inheritAttrs: false,
  props: {
    day: Object as PropType<PanelDay>,
    cell: Object as PropType<PanelCell>,
  },
  setup(props, { slots, attrs }) {
    const panel = useDatePanelContext("DatePanelCell");
    return () => {
      const chrono = props.day
        ? panel.getCellProps(props.day)
        : panel.getLevelCellProps(props.cell as PanelCell);
      const fallback = props.day
        ? props.day.hidden
          ? ""
          : String(props.day.date.day)
        : (props.cell as PanelCell).text;
      return h("td", mergeProps(attrs, chrono), slots.default?.() ?? fallback);
    };
  },
});

/** The grid of the current level. Month and year levels render in the first grid only. */
export const DatePanelGrid = defineComponent({
  name: "DatePanelGrid",
  inheritAttrs: false,
  props: { month: { type: Number, default: 0 } },
  setup(props, { slots, attrs }) {
    const panel = useDatePanelContext("DatePanelGrid");
    return () => {
      const state = panel.state.value;
      let body: VNodeChild;
      if (state.level === "day") {
        const model = state.months[props.month];
        if (!model) return null;
        body = [
          h("thead", [
            h("tr", [
              state.weekNumbers ? h("td") : null,
              ...state.weekdays.map((header) =>
                h(DatePanelWeekdayHeader, { key: header.dayOfWeek, header }),
              ),
            ]),
          ]),
          h(
            "tbody",
            model.weeks.map((week) =>
              h(
                "tr",
                {
                  key: `${week.days[0]?.date.month}-${week.days[0]?.date.day}`,
                },
                [
                  state.weekNumbers
                    ? h(DatePanelWeekNumber, { weekNumber: week.weekNumber })
                    : null,
                  ...week.days.map((day) =>
                    h(
                      DatePanelCell,
                      { key: `${day.date.month}-${day.date.day}`, day },
                      day.hidden || !slots.default
                        ? undefined
                        : () => slots.default?.(day),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ];
      } else {
        if (props.month !== 0) return null;
        const rows: PanelCell[][] = [];
        state.cells.forEach((cell, index) => {
          if (index % 4 === 0) rows.push([]);
          rows[rows.length - 1]?.push(cell);
        });
        body = [
          h(
            "tbody",
            rows.map((row) =>
              h(
                "tr",
                { key: row[0]?.key },
                row.map((cell) => h(DatePanelCell, { key: cell.key, cell })),
              ),
            ),
          ),
        ];
      }
      return h("table", mergeProps(attrs, panel.getGridProps()), body);
    };
  },
});

const PanelContent = defineComponent({
  name: "DatePanelContent",
  setup() {
    const panel = useDatePanelContext("DatePanel");
    return () => {
      const state = panel.state.value;
      const count = state.level === "day" ? state.months.length : 1;
      return [
        h(DatePanelPrevButton),
        h(DatePanelTitle),
        h(DatePanelNextButton),
        ...Array.from({ length: count }, (_, index) =>
          h(DatePanelGrid, { key: index, month: index }),
        ),
      ];
    };
  },
});

const panelRender =
  (
    panel: ReturnType<typeof useDatePanel>,
    slots: { default?: () => VNodeChild },
    attrs: Record<string, unknown>,
  ) =>
  () =>
    h(
      "div",
      mergeProps(attrs, { ...panel.getRootProps(), ref: panel.rootRef }),
      slots.default?.() ?? h(PanelContent),
    );

/** A single-date panel. Compose it with `DatePanelGrid` and friends, or render it bare. */
export const DatePanel = defineComponent({
  name: "DatePanel",
  inheritAttrs: false,
  props: panelProps,
  emits: PANEL_EMITS,
  setup(props, { slots, attrs, emit }) {
    const panel = useDatePanel(
      () =>
        ({
          ...defined(props),
          weekNumbers: weekNumbersOf(props),
          ...panelCallbacks(emit),
        }) as never,
    );
    provide(DatePanelKey, panel as never);
    return panelRender(panel, slots, attrs);
  },
});

/** A range panel (two picks). Shows two months by default. */
export const DateRangePanel = defineComponent({
  name: "DateRangePanel",
  inheritAttrs: false,
  props: rangePanelProps,
  emits: [...PANEL_EMITS, "rangePreviewChange", "invalidRange"],
  setup(props, { slots, attrs, emit }) {
    const panel = useDateRangePanel(
      () =>
        ({
          months: 2,
          ...defined(props),
          weekNumbers: weekNumbersOf(props),
          ...panelCallbacks(emit),
          onRangePreviewChange: (preview: object | null) =>
            emit("rangePreviewChange", preview),
          onInvalidRange: (reason: string) => emit("invalidRange", reason),
        }) as never,
    );
    provide(DatePanelKey, panel as never);
    return panelRender(panel as never, slots, attrs);
  },
});

/** A panel that selects any number of dates. */
export const MultiDatePanel = defineComponent({
  name: "MultiDatePanel",
  inheritAttrs: false,
  props: multiPanelProps,
  emits: PANEL_EMITS,
  setup(props, { slots, attrs, emit }) {
    const panel = useMultiDatePanel(
      () =>
        ({
          ...defined(props),
          weekNumbers: weekNumbersOf(props),
          ...panelCallbacks(emit),
        }) as never,
    );
    provide(DatePanelKey, panel as never);
    return panelRender(panel as never, slots, attrs);
  },
});
