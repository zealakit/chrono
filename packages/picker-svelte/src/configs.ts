import type { Component } from "svelte";
import {
  DateInput,
  DatePanel,
  DateRangeInput,
  DateRangePanel,
} from "@zealakit/chrono-svelte/date";
import {
  DateTimeInput,
  DateTimePanel,
  DateTimeRangeInput,
  DateTimeRangePanel,
} from "@zealakit/chrono-svelte/datetime";
import {
  TimeInput,
  TimePanel,
  TimeRangeInput,
  TimeRangePanel,
} from "@zealakit/chrono-svelte/time";
import type { PickerConfig } from "./picker-context.js";

const as = (component: unknown): Component<Record<string, unknown>> =>
  component as Component<Record<string, unknown>>;

export const datePickerConfig: PickerConfig = {
  Input: as(DateInput),
  Panel: as(DatePanel),
  label: "Choose date",
};
export const dateRangePickerConfig: PickerConfig = {
  Input: as(DateRangeInput),
  Panel: as(DateRangePanel),
  label: "Choose dates",
};
export const timePickerConfig: PickerConfig = {
  Input: as(TimeInput),
  Panel: as(TimePanel),
  label: "Choose time",
};
export const timeRangePickerConfig: PickerConfig = {
  Input: as(TimeRangeInput),
  Panel: as(TimeRangePanel),
  label: "Choose times",
};
export const dateTimePickerConfig: PickerConfig = {
  Input: as(DateTimeInput),
  Panel: as(DateTimePanel),
  label: "Choose date and time",
};
export const dateTimeRangePickerConfig: PickerConfig = {
  Input: as(DateTimeRangeInput),
  Panel: as(DateTimeRangePanel),
  label: "Choose dates and times",
};
