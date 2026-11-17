import type {
  DateTimeInputOptions,
  DateTimePanelOptions,
  DateTimeRangeInputOptions,
  DateTimeRangePanelOptions,
} from "@zealakit/chrono-core/datetime";

const PANEL_KEYS = [
  "value",
  "defaultValue",
  "onValueChange",
  "onValueCommit",
  "timeZone",
  "valueTimeZone",
  "disambiguation",
  "defaultTime",
  "min",
  "max",
  "disablePast",
  "isDateDisabled",
  "isDateUnavailable",
  "isTimeDisabled",
  "isTimeUnavailable",
  "date",
  "time",
  "locale",
  "now",
  "readOnly",
  "disabled",
  "autoFocus",
  "messages",
] as const satisfies readonly (keyof DateTimePanelOptions)[];

const RANGE_PANEL_KEYS = [
  "value",
  "defaultValue",
  "onValueChange",
  "onValueCommit",
  "timeZone",
  "valueTimeZone",
  "disambiguation",
  "minDuration",
  "maxDuration",
  "min",
  "max",
  "disablePast",
  "isDateDisabled",
  "isDateUnavailable",
  "isTimeDisabled",
  "date",
  "startTime",
  "endTime",
  "onInvalidRange",
  "locale",
  "now",
  "readOnly",
  "disabled",
  "autoFocus",
  "messages",
] as const satisfies readonly (keyof DateTimeRangePanelOptions)[];

const INPUT_KEYS = [
  "value",
  "defaultValue",
  "onValueChange",
  "onValueCommit",
  "mode",
  "timeZone",
  "valueTimeZone",
  "disambiguation",
  "granularity",
  "hourCycle",
  "step",
  "min",
  "max",
  "disablePast",
  "isDateDisabled",
  "isDateUnavailable",
  "isTimeDisabled",
  "onInvalidInput",
  "name",
  "formValue",
  "required",
  "readOnly",
  "disabled",
  "locale",
  "now",
  "messages",
] as const satisfies readonly (keyof DateTimeInputOptions)[];

const RANGE_INPUT_KEYS = [
  ...INPUT_KEYS,
  "startName",
  "endName",
  "minDuration",
  "maxDuration",
] as const satisfies readonly (keyof DateTimeRangeInputOptions)[];

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

export const splitDateTimePanelProps = (props: object) =>
  split<DateTimePanelOptions>(props, PANEL_KEYS);
export const splitDateTimeRangePanelProps = (props: object) =>
  split<DateTimeRangePanelOptions>(props, RANGE_PANEL_KEYS);
export const splitDateTimeInputProps = (props: object) =>
  split<DateTimeInputOptions>(props, INPUT_KEYS);
export const splitDateTimeRangeInputProps = (props: object) =>
  split<DateTimeRangeInputOptions>(props, RANGE_INPUT_KEYS);
