import type { DateTimeSegmentView } from "@zealakit/chrono-core/datetime";
import type {
  DateTimeInput as DateTimeInputValue,
  PlainDate,
  PlainTime,
} from "@zealakit/chrono-core/foundation";
import { type PropType, defineComponent, h, mergeProps, provide } from "vue";
import {
  DatePanelGrid,
  DatePanelNextButton,
  DatePanelPrevButton,
  DatePanelTitle,
} from "../date/components.js";
import { DatePanelKey } from "../date/context.js";
import { TimePanelColumn, TimePanelList } from "../time/components.js";
import { TimePanelKey } from "../time/context.js";
import {
  DateTimeFieldKey,
  DateTimePanelKey,
  DateTimeRangeKey,
  useDateTimeFieldContext,
  useDateTimePanelContext,
  useDateTimeRangeContext,
} from "./context.js";
import {
  useDateTimeInput,
  useDateTimeRangeInput,
} from "./use-datetime-input.js";
import {
  useDateTimePanel,
  useDateTimeRangePanel,
} from "./use-datetime-panel.js";

const dateTimeInput = [String, Object] as PropType<DateTimeInputValue>;
const bool = { type: Boolean, default: undefined } as const;
const fn = <T>() => Function as PropType<T>;

const baseProps = {
  id: String,
  value: null as unknown as PropType<unknown>,
  defaultValue: null as unknown as PropType<unknown>,
  timeZone: String,
  valueTimeZone: String,
  disambiguation: String as PropType<
    "compatible" | "earlier" | "later" | "reject"
  >,
  min: dateTimeInput,
  max: dateTimeInput,
  disablePast: bool,
  isDateDisabled: fn<(date: PlainDate) => boolean>(),
  isDateUnavailable: fn<(date: PlainDate) => boolean>(),
  isTimeDisabled: fn<(time: PlainTime, date: PlainDate) => boolean>(),
  locale: String,
  now: Number,
  messages: Object as PropType<Record<string, string>>,
  readOnly: bool,
  disabled: bool,
};

const panelProps = {
  ...baseProps,
  isTimeUnavailable: fn<(time: PlainTime, date: PlainDate) => boolean>(),
  defaultTime: String,
  date: Object as PropType<Record<string, unknown>>,
  time: Object as PropType<Record<string, unknown>>,
  autoFocus: bool,
} as const;

const rangePanelProps = {
  ...baseProps,
  minDuration: Number,
  maxDuration: Number,
  date: Object as PropType<Record<string, unknown>>,
  startTime: Object as PropType<Record<string, unknown>>,
  endTime: Object as PropType<Record<string, unknown>>,
  autoFocus: bool,
} as const;

const inputProps = {
  ...baseProps,
  mode: String as PropType<"segmented" | "text">,
  granularity: String as PropType<"hour" | "minute" | "second">,
  hourCycle: String as PropType<"h12" | "h23">,
  step: Object as PropType<{ minutes?: number; seconds?: number }>,
  name: String,
  formValue: fn<(value: unknown) => string>(),
  required: bool,
} as const;

const rangeInputProps = {
  ...inputProps,
  startName: String,
  endName: String,
  minDuration: Number,
  maxDuration: Number,
} as const;

function defined(props: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  );
}
type Emit = (event: string, ...args: unknown[]) => void;

// ---------------------------------------------------------------- inputs

export const DateTimeInputSegment = defineComponent({
  name: "DateTimeInputSegment",
  inheritAttrs: false,
  props: {
    segment: { type: Object as PropType<DateTimeSegmentView>, required: true },
  },
  setup(props, { slots, attrs }) {
    const field = useDateTimeFieldContext("DateTimeInputSegment");
    return () =>
      h(
        "span",
        mergeProps(attrs, field.getSegmentProps(props.segment)),
        slots.default?.(props.segment) ?? props.segment.text,
      );
  },
});

export const DateTimeInputLiteral = defineComponent({
  name: "DateTimeInputLiteral",
  inheritAttrs: false,
  props: {
    segment: { type: Object as PropType<DateTimeSegmentView>, required: true },
  },
  setup(props, { slots, attrs }) {
    const field = useDateTimeFieldContext("DateTimeInputLiteral");
    return () =>
      h(
        "span",
        mergeProps(attrs, field.getSegmentProps(props.segment)),
        slots.default?.() ?? props.segment.text,
      );
  },
});

export const DateTimeInputDateField = defineComponent({
  name: "DateTimeInputDateField",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const field = useDateTimeFieldContext("DateTimeInputDateField");
    return () => h("input", mergeProps(attrs, field.getDateFieldProps()));
  },
});

export const DateTimeInputTimeField = defineComponent({
  name: "DateTimeInputTimeField",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const field = useDateTimeFieldContext("DateTimeInputTimeField");
    return () => h("input", mergeProps(attrs, field.getTimeFieldProps()));
  },
});

export const DateTimeInputClearButton = defineComponent({
  name: "DateTimeInputClearButton",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const field = useDateTimeFieldContext("DateTimeInputClearButton");
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

/** The display zone as read-only text. It is useful context, so it is not `aria-hidden`. */
export const DateTimeInputTimeZone = defineComponent({
  name: "DateTimeInputTimeZone",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const field = useDateTimeFieldContext("DateTimeInputTimeZone");
    return () =>
      field.state.value.zoneLabel
        ? h("span", attrs, slots.default?.() ?? field.state.value.zoneLabel)
        : null;
  },
});

const FieldContent = defineComponent({
  name: "DateTimeInputContent",
  setup() {
    const field = useDateTimeFieldContext("DateTimeInput");
    return () => {
      const state = field.state.value;
      if (state.mode === "text")
        return [h(DateTimeInputDateField), h(DateTimeInputTimeField)];
      return state.segments.map((segment, index) =>
        segment.type === "literal"
          ? h(DateTimeInputLiteral, { key: index, segment })
          : h(DateTimeInputSegment, { key: segment.type, segment }),
      );
    };
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

/** A date-time field: one group of segments, or a date field and a time field. */
export const DateTimeInput = defineComponent({
  name: "DateTimeInput",
  inheritAttrs: false,
  props: inputProps,
  emits: ["update:value", "valueCommit", "invalidInput"],
  setup(props, { slots, attrs, emit }) {
    const field = useDateTimeInput(
      () =>
        ({
          ...defined(props),
          onValueChange: (value: unknown, info: unknown) =>
            emit("update:value", value, info),
          onValueCommit: (value: unknown) => emit("valueCommit", value),
          onInvalidInput: (text: string) => emit("invalidInput", text),
        }) as never,
    );
    provide(DateTimeFieldKey, field);
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
      const range = useDateTimeRangeContext(name);
      const field = range[side];
      provide(DateTimeFieldKey, field);
      return () =>
        h(
          "div",
          mergeProps(attrs, {
            ...field.getRootProps(),
            role: "group",
            "aria-label":
              field.state.value.messages[
                side === "start" ? "startDateTime" : "endDateTime"
              ],
            ref: field.rootRef,
          }),
          slots.default ? slots.default(field.state.value) : h(FieldContent),
        );
    },
  });
}

export const DateTimeRangeInputStart = rangeField(
  "DateTimeRangeInputStart",
  "start",
);
export const DateTimeRangeInputEnd = rangeField("DateTimeRangeInputEnd", "end");

/** Two date-time fields (start and end) in one group. */
export const DateTimeRangeInput = defineComponent({
  name: "DateTimeRangeInput",
  inheritAttrs: false,
  props: rangeInputProps,
  emits: ["update:value", "valueCommit", "invalidInput"],
  setup(props, { slots, attrs, emit }) {
    const range = useDateTimeRangeInput(
      () =>
        ({
          ...defined(props),
          onValueChange: (value: unknown) => emit("update:value", value),
          onValueCommit: (value: unknown) => emit("valueCommit", value),
          onInvalidInput: (text: string) => emit("invalidInput", text),
        }) as never,
    );
    provide(DateTimeRangeKey, range);
    return () =>
      h("div", mergeProps(attrs, range.getRootProps()), [
        slots.default
          ? slots.default()
          : [
              h(DateTimeRangeInputStart),
              h("span", { "aria-hidden": "true" }, "–"),
              h(DateTimeRangeInputEnd),
            ],
        ...hidden(range.state.value.hidden),
      ]);
  },
});

// ---------------------------------------------------------------- panels

const DefaultDate = defineComponent({
  name: "DateTimePanelDateContent",
  setup() {
    return () => [
      h(DatePanelPrevButton),
      h(DatePanelTitle),
      h(DatePanelNextButton),
      h(DatePanelGrid),
    ];
  },
});

function defaultTime(state: {
  layout: string;
  sets: { columns: { key: string }[] }[];
}) {
  if (state.layout === "list") return h(TimePanelList);
  return (state.sets[0]?.columns ?? []).map((column) =>
    h(TimePanelColumn, { key: column.key, column: column as never }),
  );
}

/** Provides the Date panel context: put `DatePanelGrid`, `DatePanelCell`... from `/date` inside. */
export const DateTimePanelDate = defineComponent({
  name: "DateTimePanelDate",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const panel = useDateTimePanelContext("DateTimePanelDate");
    provide(DatePanelKey, panel.date as never);
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          ...panel.date.getRootProps(),
          ref: panel.date.rootRef,
        }),
        slots.default?.() ?? h(DefaultDate),
      );
  },
});

/** Provides the Time panel context: put `TimePanelColumn`, `TimePanelOption`... from `/time` inside. */
export const DateTimePanelTime = defineComponent({
  name: "DateTimePanelTime",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const panel = useDateTimePanelContext("DateTimePanelTime");
    provide(TimePanelKey, panel.time as never);
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          ...panel.time.getRootProps(),
          ref: panel.time.rootRef,
        }),
        slots.default?.() ?? defaultTime(panel.state.value.time as never),
      );
  },
});

export const DateTimeRangePanelDate = DateTimePanelDate;

function rangeTime(name: string, which: "startTime" | "endTime") {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const panel = useDateTimePanelContext(name);
      const bound = panel[which];
      provide(TimePanelKey, bound as never);
      return () =>
        h(
          "div",
          mergeProps(attrs, { ...bound.getRootProps(), ref: bound.rootRef }),
          slots.default?.() ?? defaultTime(panel.state.value[which] as never),
        );
    },
  });
}

export const DateTimeRangePanelStartTime = rangeTime(
  "DateTimeRangePanelStartTime",
  "startTime",
);
export const DateTimeRangePanelEndTime = rangeTime(
  "DateTimeRangePanelEndTime",
  "endTime",
);

const callbacks = (emit: Emit) => ({
  onValueChange: (value: unknown, info?: unknown) =>
    emit("update:value", value, info),
  onValueCommit: (value: unknown) => emit("valueCommit", value),
});

/** A date panel and a time panel composed by one controller. */
export const DateTimePanel = defineComponent({
  name: "DateTimePanel",
  inheritAttrs: false,
  props: panelProps,
  emits: ["update:value", "valueCommit"],
  setup(props, { slots, attrs, emit }) {
    const panel = useDateTimePanel(
      () =>
        ({ ...defined(props), ...callbacks(emit as unknown as Emit) }) as never,
    );
    provide(DateTimePanelKey, panel);
    return () =>
      h(
        "div",
        mergeProps(attrs, panel.getRootProps()),
        slots.default?.() ?? [h(DateTimePanelDate), h(DateTimePanelTime)],
      );
  },
});

/** A date range panel with a start time and an end time. */
export const DateTimeRangePanel = defineComponent({
  name: "DateTimeRangePanel",
  inheritAttrs: false,
  props: rangePanelProps,
  emits: ["update:value", "valueCommit", "invalidRange"],
  setup(props, { slots, attrs, emit }) {
    const panel = useDateTimeRangePanel(
      () =>
        ({
          ...defined(props),
          ...callbacks(emit as unknown as Emit),
          onInvalidRange: (reason: string) => emit("invalidRange", reason),
        }) as never,
    );
    provide(DateTimePanelKey, panel);
    return () =>
      h(
        "div",
        mergeProps(attrs, panel.getRootProps()),
        slots.default?.() ?? [
          h(DateTimePanelDate),
          h(DateTimeRangePanelStartTime),
          h(DateTimeRangePanelEndTime),
        ],
      );
  },
});
