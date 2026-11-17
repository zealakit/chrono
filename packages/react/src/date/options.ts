import type {
  DatePanelOptions,
  DateInputOptions,
  DateRangeInputOptions,
  DateRangePanelOptions,
  MultiDatePanelOptions,
} from "@zealakit/chrono-core/date";

const BASE_PANEL_KEYS = [
  "visibleMonth",
  "defaultVisibleMonth",
  "onVisibleMonthChange",
  "level",
  "defaultLevel",
  "onLevelChange",
  "minLevel",
  "maxLevel",
  "months",
  "pageBy",
  "followValue",
  "autoFocus",
  "min",
  "max",
  "isDateDisabled",
  "isDateUnavailable",
  "locale",
  "weekStartsOn",
  "timeZone",
  "now",
  "weekNumbers",
  "readOnly",
  "disabled",
  "messages",
  "selectToday",
  "value",
  "defaultValue",
  "onValueChange",
  "onValueCommit",
] as const;

const PANEL_KEYS =
  BASE_PANEL_KEYS satisfies readonly (keyof DatePanelOptions)[];

const RANGE_PANEL_KEYS = [
  ...BASE_PANEL_KEYS,
  "onRangePreviewChange",
  "onInvalidRange",
  "minDays",
  "maxDays",
  "allowUnavailableInside",
  "allowDisabledInside",
] as const satisfies readonly (keyof DateRangePanelOptions)[];

const MULTI_PANEL_KEYS = [
  ...BASE_PANEL_KEYS,
  "maxSelected",
] as const satisfies readonly (keyof MultiDatePanelOptions)[];

const INPUT_KEYS = [
  "value",
  "defaultValue",
  "onValueChange",
  "onValueCommit",
  "mode",
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
  "isDateDisabled",
  "isDateUnavailable",
  "locale",
  "timeZone",
  "now",
  "messages",
] as const satisfies readonly (keyof DateInputOptions)[];

const RANGE_INPUT_KEYS = [
  ...INPUT_KEYS,
  "startName",
  "endName",
  "minDays",
  "maxDays",
  "allowUnavailableInside",
  "allowDisabledInside",
] as const satisfies readonly (keyof DateRangeInputOptions)[];

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

/** Separate the controller options from the element props a part receives. */
export const splitDatePanelProps = (props: object) =>
  split<DatePanelOptions>(props, PANEL_KEYS);
export const splitDateRangePanelProps = (props: object) =>
  split<DateRangePanelOptions>(props, RANGE_PANEL_KEYS);
export const splitMultiDatePanelProps = (props: object) =>
  split<MultiDatePanelOptions>(props, MULTI_PANEL_KEYS);
export const splitDateInputProps = (props: object) =>
  split<DateInputOptions>(props, INPUT_KEYS);
export const splitDateRangeInputProps = (props: object) =>
  split<DateRangeInputOptions>(props, RANGE_INPUT_KEYS);
