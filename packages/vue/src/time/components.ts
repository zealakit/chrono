import type {
  BookingSlot,
  TimePanelColumnState,
  TimePanelGroupState,
  TimePanelOptionState,
  TimePanelSetState,
  TimeSegmentView,
} from "@zealakit/chrono-core/time";
import type {
  PlainTime,
  TimeInput as TimeInputValue,
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
  TimeFieldKey,
  TimePanelKey,
  TimeRangeKey,
  useTimeFieldContext,
  useTimePanelContext,
  useTimeRangeContext,
} from "./context.js";
import { useTimeInput, useTimeRangeInput } from "./use-time-input.js";
import { useTimePanel, useTimeRangePanel } from "./use-time-panel.js";

const timeInput = [String, Object] as PropType<TimeInputValue>;
const bool = { type: Boolean, default: undefined } as const;
const fn = <T>() => Function as PropType<T>;

const baseProps = {
  id: String,
  value: null as unknown as PropType<unknown>,
  defaultValue: null as unknown as PropType<unknown>,
  granularity: String as PropType<"hour" | "minute" | "second">,
  hourCycle: String as PropType<"h12" | "h23">,
  step: Object as PropType<{ minutes?: number; seconds?: number }>,
  min: timeInput,
  max: timeInput,
  disabledRanges: Array as PropType<
    { start: TimeInputValue; end: TimeInputValue }[]
  >,
  isTimeDisabled: fn<(time: PlainTime) => boolean>(),
  isTimeUnavailable: fn<(time: PlainTime) => boolean>(),
  locale: String,
  timeZone: String,
  now: Number,
  messages: Object as PropType<Record<string, string>>,
  readOnly: bool,
  disabled: bool,
};

const panelProps = {
  ...baseProps,
  layout: String as PropType<"columns" | "list">,
  start: timeInput,
  end: timeInput,
  slotDuration: Number,
  slots: Array as PropType<
    {
      start: TimeInputValue;
      end?: TimeInputValue;
      available?: boolean;
      data?: unknown;
    }[]
  >,
  groupBy: [String, Boolean, Function] as PropType<
    | false
    | "hour"
    | "dayPeriod"
    | ((time: PlainTime) => { key: string; label: string })
  >,
  scrollToSelected: bool,
  autoFocus: bool,
  timer: fn<() => number>(),
} as const;

const rangePanelProps = {
  ...panelProps,
  allowOvernight: bool,
  minDuration: Number,
  maxDuration: Number,
} as const;

const inputProps = {
  ...baseProps,
  mode: String as PropType<"segmented" | "text">,
  placeholderValue: timeInput,
  parse: fn<(text: string, context: object) => PlainTime | null>(),
  format: fn<(time: PlainTime, context: object) => string>(),
  name: String,
  required: bool,
} as const;

const rangeInputProps = {
  ...inputProps,
  startName: String,
  endName: String,
  allowOvernight: bool,
  minDuration: Number,
  maxDuration: Number,
} as const;

/** Drop `undefined` props so the controller sees them as not passed. */
function defined(props: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  );
}

type Emit = (event: string, ...args: unknown[]) => void;

// ---------------------------------------------------------------- inputs

/** The default content of a field: segments, or the text field. */
function fieldContent() {
  const field = useTimeFieldContext("TimeInput");
  const { state } = field;
  return (): VNodeChild => {
    if (state.value.mode === "text") return h(TimeInputTextField);
    return state.value.segments.map((segment, index) =>
      segment.type === "literal"
        ? h(TimeInputLiteral, { key: index, segment })
        : h(TimeInputSegment, { key: segment.type, segment }),
    );
  };
}

const FieldContent = defineComponent({
  name: "TimeInputContent",
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

export const TimeInputSegment = defineComponent({
  name: "TimeInputSegment",
  inheritAttrs: false,
  props: {
    segment: { type: Object as PropType<TimeSegmentView>, required: true },
  },
  setup(props, { slots, attrs }) {
    const field = useTimeFieldContext("TimeInputSegment");
    return () =>
      h(
        "span",
        mergeProps(attrs, field.getSegmentProps(props.segment)),
        slots.default?.(props.segment) ?? props.segment.text,
      );
  },
});

export const TimeInputLiteral = defineComponent({
  name: "TimeInputLiteral",
  inheritAttrs: false,
  props: {
    segment: { type: Object as PropType<TimeSegmentView>, required: true },
  },
  setup(props, { slots, attrs }) {
    const field = useTimeFieldContext("TimeInputLiteral");
    return () =>
      h(
        "span",
        mergeProps(attrs, field.getSegmentProps(props.segment)),
        slots.default?.() ?? props.segment.text,
      );
  },
});

export const TimeInputTextField = defineComponent({
  name: "TimeInputTextField",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const field = useTimeFieldContext("TimeInputTextField");
    return () => h("input", mergeProps(attrs, field.getTextFieldProps()));
  },
});

export const TimeInputClearButton = defineComponent({
  name: "TimeInputClearButton",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const field = useTimeFieldContext("TimeInputClearButton");
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
export const TimeInput = defineComponent({
  name: "TimeInput",
  inheritAttrs: false,
  props: inputProps,
  emits: ["update:value", "valueCommit", "invalidInput"],
  setup(props, { slots, attrs, emit }) {
    const field = useTimeInput(
      () =>
        ({
          ...defined(props),
          onValueChange: (value: unknown) => emit("update:value", value),
          onValueCommit: (value: unknown) => emit("valueCommit", value),
          onInvalidInput: (text: string) => emit("invalidInput", text),
        }) as never,
    );
    provide(TimeFieldKey, field);
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
      const range = useTimeRangeContext(name);
      const field = range[side];
      provide(TimeFieldKey, field);
      return () =>
        h(
          "div",
          mergeProps(attrs, {
            ...field.getRootProps(),
            role: "group",
            "aria-label":
              field.state.value.messages[
                side === "start" ? "startTime" : "endTime"
              ],
            ref: field.rootRef,
          }),
          slots.default ? slots.default(field.state.value) : h(FieldContent),
        );
    },
  });
}

export const TimeRangeInputStart = rangeField("TimeRangeInputStart", "start");
export const TimeRangeInputEnd = rangeField("TimeRangeInputEnd", "end");

/** Two date fields (start and end) in one group, in both modes. */
export const TimeRangeInput = defineComponent({
  name: "TimeRangeInput",
  inheritAttrs: false,
  props: rangeInputProps,
  emits: ["update:value", "valueCommit", "invalidInput"],
  setup(props, { slots, attrs, emit }) {
    const range = useTimeRangeInput(
      () =>
        ({
          ...defined(props),
          onValueChange: (value: unknown) => emit("update:value", value),
          onValueCommit: (value: unknown) => emit("valueCommit", value),
          onInvalidInput: (text: string) => emit("invalidInput", text),
        }) as never,
    );
    provide(TimeRangeKey, range);
    return () =>
      h("div", mergeProps(attrs, range.getRootProps()), [
        slots.default
          ? slots.default()
          : [
              h(TimeRangeInputStart),
              h("span", { "aria-hidden": "true" }, "–"),
              h(TimeRangeInputEnd),
            ],
        ...hidden(range.state.value.hidden),
      ]);
  },
});

// ---------------------------------------------------------------- panels

export const TimePanelOption = defineComponent({
  name: "TimePanelOption",
  inheritAttrs: false,
  props: {
    option: { type: Object as PropType<TimePanelOptionState>, required: true },
  },
  setup(props, { slots, attrs }) {
    const panel = useTimePanelContext("TimePanelOption");
    return () => {
      const slot: BookingSlot | undefined = panel.controller.getSlot(
        props.option.key,
      );
      return h(
        "div",
        mergeProps(attrs, panel.getOptionProps(props.option)),
        slots.default?.({ option: props.option, slot }) ?? props.option.text,
      );
    };
  },
});

export const TimePanelColumn = defineComponent({
  name: "TimePanelColumn",
  inheritAttrs: false,
  props: {
    column: { type: Object as PropType<TimePanelColumnState>, required: true },
  },
  setup(props, { slots, attrs }) {
    const panel = useTimePanelContext("TimePanelColumn");
    return () =>
      h(
        "div",
        mergeProps(attrs, panel.getColumnProps(props.column)),
        slots.default
          ? slots.default(props.column)
          : props.column.options.map((option) =>
              h(TimePanelOption, { key: option.key, option }),
            ),
      );
  },
});

export const TimePanelGroup = defineComponent({
  name: "TimePanelGroup",
  inheritAttrs: false,
  props: {
    group: { type: Object as PropType<TimePanelGroupState>, required: true },
  },
  setup(props, { slots, attrs }) {
    const panel = useTimePanelContext("TimePanelGroup");
    return () =>
      h(
        "div",
        mergeProps(attrs, panel.getGroupProps(props.group)),
        slots.default?.() ??
          props.group.options.map((option) =>
            h(TimePanelOption, { key: option.key, option }),
          ),
      );
  },
});

export const TimePanelGroupLabel = defineComponent({
  name: "TimePanelGroupLabel",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h("div", attrs, slots.default?.());
  },
});

export const TimePanelList = defineComponent({
  name: "TimePanelList",
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    const panel = useTimePanelContext("TimePanelList");
    return () => {
      const { groups } = panel.state.value;
      return h(
        "div",
        mergeProps(attrs, panel.getListProps()),
        slots.default
          ? slots.default(groups)
          : groups.map((group) =>
              h(TimePanelGroup, { key: group.key, group }, () => [
                ...(group.label
                  ? [h(TimePanelGroupLabel, null, () => group.label)]
                  : []),
                ...group.options.map((option) =>
                  h(TimePanelOption, { key: option.key, option }),
                ),
              ]),
            ),
      );
    };
  },
});

function setContent(set: TimePanelSetState) {
  return set.columns.map((column) =>
    h(TimePanelColumn, { key: column.key, column }),
  );
}

function rangeSet(name: string, side: "start" | "end") {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_props, { slots, attrs }) {
      const panel = useTimePanelContext(name);
      return () => {
        const set = panel.state.value.sets.find((item) => item.key === side);
        if (!set) return null;
        return h(
          "div",
          mergeProps(attrs, panel.getSetProps(set)),
          slots.default?.() ?? setContent(set),
        );
      };
    },
  });
}

export const TimeRangePanelStart = rangeSet("TimeRangePanelStart", "start");
export const TimeRangePanelEnd = rangeSet("TimeRangePanelEnd", "end");

const PanelContent = defineComponent({
  name: "TimePanelContent",
  setup() {
    const panel = useTimePanelContext("TimePanel");
    return () => {
      const state = panel.state.value;
      if (state.layout === "list") return h(TimePanelList);
      return state.sets.flatMap((set) =>
        state.kind === "range"
          ? [
              h(set.key === "start" ? TimeRangePanelStart : TimeRangePanelEnd, {
                key: set.key,
              }),
            ]
          : set.columns.map((column) =>
              h(TimePanelColumn, { key: column.key, column }),
            ),
      );
    };
  },
});

const panelRender =
  (
    panel: ReturnType<typeof useTimePanel>,
    slots: { default?: () => VNodeChild },
    attrs: Record<string, unknown>,
  ) =>
  () =>
    h(
      "div",
      mergeProps(attrs, { ...panel.getRootProps(), ref: panel.rootRef }),
      slots.default?.() ?? h(PanelContent),
    );

const callbacks = (emit: Emit) => ({
  onValueChange: (value: unknown) => emit("update:value", value),
  onValueCommit: (value: unknown, info?: unknown) =>
    emit("valueCommit", value, info),
});

/** A single-time panel: columns (default) or a list of times or slots. */
export const TimePanel = defineComponent({
  name: "TimePanel",
  inheritAttrs: false,
  props: panelProps,
  emits: ["update:value", "valueCommit"],
  setup(props, { slots, attrs, emit }) {
    const panel = useTimePanel(
      () =>
        ({ ...defined(props), ...callbacks(emit as unknown as Emit) }) as never,
    );
    provide(TimePanelKey, panel as never);
    return panelRender(panel, slots, attrs);
  },
});

/** A range panel (two picks): a list (default) or two column sets. */
export const TimeRangePanel = defineComponent({
  name: "TimeRangePanel",
  inheritAttrs: false,
  props: rangePanelProps,
  emits: ["update:value", "valueCommit", "rangePreviewChange", "invalidRange"],
  setup(props, { slots, attrs, emit }) {
    const panel = useTimeRangePanel(
      () =>
        ({
          ...defined(props),
          ...callbacks(emit as unknown as Emit),
          onRangePreviewChange: (preview: object | null) =>
            emit("rangePreviewChange", preview),
          onInvalidRange: (reason: string) => emit("invalidRange", reason),
        }) as never,
    );
    provide(TimePanelKey, panel as never);
    return panelRender(panel as never, slots, attrs);
  },
});
