import type {
  TimeInputOptions,
  TimePanelOptions,
  TimeRangeInputOptions,
  TimeRangePanelOptions,
} from "@zealakit/chrono-core/time";

const BASE_PANEL_KEYS = [
  "layout",
  "granularity",
  "hourCycle",
  "step",
  "start",
  "end",
  "slotDuration",
  "slots",
  "groupBy",
  "min",
  "max",
  "disabledRanges",
  "isTimeDisabled",
  "isTimeUnavailable",
  "scrollToSelected",
  "autoFocus",
  "readOnly",
  "disabled",
  "locale",
  "timeZone",
  "now",
  "messages",
  "timer",
  "value",
  "defaultValue",
  "onValueChange",
  "onValueCommit",
] as const;

const PANEL_KEYS =
  BASE_PANEL_KEYS satisfies readonly (keyof TimePanelOptions)[];

const RANGE_PANEL_KEYS = [
  ...BASE_PANEL_KEYS,
  "onRangePreviewChange",
  "onInvalidRange",
  "allowOvernight",
  "minDuration",
  "maxDuration",
] as const satisfies readonly (keyof TimeRangePanelOptions)[];

const INPUT_KEYS = [
  "value",
  "defaultValue",
  "onValueChange",
  "onValueCommit",
  "mode",
  "granularity",
  "hourCycle",
  "step",
  "placeholderValue",
  "parse",
  "format",
  "onInvalidInput",
  "name",
  "required",
  "readOnly",
  "disabled",
  "min",
  "max",
  "disabledRanges",
  "isTimeDisabled",
  "isTimeUnavailable",
  "locale",
  "timeZone",
  "now",
  "messages",
] as const satisfies readonly (keyof TimeInputOptions)[];

const RANGE_INPUT_KEYS = [
  ...INPUT_KEYS,
  "startName",
  "endName",
  "allowOvernight",
  "minDuration",
  "maxDuration",
] as const satisfies readonly (keyof TimeRangeInputOptions)[];

function split<O extends object>(
  props: object,
  keys: readonly string[],
): [O, Record<string, unknown>] {
  const options: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    (keys.includes(key) ? options : rest)[key] = value;
  }
  return [options as O, rest];
}

export const splitTimePanelProps = (props: object) =>
  split<TimePanelOptions>(props, PANEL_KEYS);
export const splitTimeRangePanelProps = (props: object) =>
  split<TimeRangePanelOptions>(props, RANGE_PANEL_KEYS);
export const splitTimeInputProps = (props: object) =>
  split<TimeInputOptions>(props, INPUT_KEYS);
export const splitTimeRangeInputProps = (props: object) =>
  split<TimeRangeInputOptions>(props, RANGE_INPUT_KEYS);
