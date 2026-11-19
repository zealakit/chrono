"use client";

import {
  DateRangeInput,
  type DateRangeInputProps,
  DateRangePanel,
  type DateRangePanelProps,
  type DateRangeValue,
  DateInput,
  type DateInputProps,
  DatePanel,
  type DatePanelProps,
  type DateValue,
} from "@zealakit/chrono-react/date";
import {
  DateTimeInput,
  type DateTimeInputProps,
  DateTimePanel,
  type DateTimePanelProps,
  DateTimeRangeInput,
  type DateTimeRangeInputProps,
  DateTimeRangePanel,
  type DateTimeRangePanelProps,
  type DateTimeRangeValue,
  type DateTimeValue,
} from "@zealakit/chrono-react/datetime";
import {
  TimeInput,
  type TimeInputProps,
  TimePanel,
  type TimePanelProps,
  TimeRangeInput,
  type TimeRangeInputProps,
  TimeRangePanel,
  type TimeRangePanelProps,
  type TimeRangeValue,
  type TimeValue,
} from "@zealakit/chrono-react/time";
import { type PickerParts, createPicker } from "./create-picker.js";

const date = createPicker<DateValue, DateInputProps, DatePanelProps>({
  Input: DateInput,
  Panel: DatePanel,
  label: "Choose date",
});
const dateRange = createPicker<
  DateRangeValue,
  DateRangeInputProps,
  DateRangePanelProps
>({ Input: DateRangeInput, Panel: DateRangePanel, label: "Choose dates" });
const time = createPicker<TimeValue, TimeInputProps, TimePanelProps>({
  Input: TimeInput,
  Panel: TimePanel,
  label: "Choose time",
});
const timeRange = createPicker<
  TimeRangeValue,
  TimeRangeInputProps,
  TimeRangePanelProps
>({ Input: TimeRangeInput, Panel: TimeRangePanel, label: "Choose times" });
const dateTime = createPicker<
  DateTimeValue,
  DateTimeInputProps,
  DateTimePanelProps
>({
  Input: DateTimeInput,
  Panel: DateTimePanel,
  label: "Choose date and time",
});
const dateTimeRange = createPicker<
  DateTimeRangeValue,
  DateTimeRangeInputProps,
  DateTimeRangePanelProps
>({
  Input: DateTimeRangeInput,
  Panel: DateTimeRangePanel,
  label: "Choose dates and times",
});

/** The parts of the Date picker (named so declarations never expand adapter types). */
export type DatePickerParts = PickerParts<
  DateValue,
  DateInputProps,
  DatePanelProps
>;
/** The parts of the DateRange picker (named so declarations never expand adapter types). */
export type DateRangePickerParts = PickerParts<
  DateRangeValue,
  DateRangeInputProps,
  DateRangePanelProps
>;
/** The parts of the Time picker (named so declarations never expand adapter types). */
export type TimePickerParts = PickerParts<
  TimeValue,
  TimeInputProps,
  TimePanelProps
>;
/** The parts of the TimeRange picker (named so declarations never expand adapter types). */
export type TimeRangePickerParts = PickerParts<
  TimeRangeValue,
  TimeRangeInputProps,
  TimeRangePanelProps
>;
/** The parts of the DateTime picker (named so declarations never expand adapter types). */
export type DateTimePickerParts = PickerParts<
  DateTimeValue,
  DateTimeInputProps,
  DateTimePanelProps
>;
/** The parts of the DateTimeRange picker (named so declarations never expand adapter types). */
export type DateTimeRangePickerParts = PickerParts<
  DateTimeRangeValue,
  DateTimeRangeInputProps,
  DateTimeRangePanelProps
>;

export const DatePickerRoot: DatePickerParts["Root"] = date.Root;
export const DatePickerInput: DatePickerParts["Input"] = date.Input;
export const DatePickerTrigger: DatePickerParts["Trigger"] = date.Trigger;
export const DatePickerContent: DatePickerParts["Content"] = date.Content;
export const DatePickerPanel: DatePickerParts["Panel"] = date.Panel;
export const DatePicker: DatePickerParts = {
  Root: date.Root,
  Input: date.Input,
  Trigger: date.Trigger,
  Content: date.Content,
  Panel: date.Panel,
};

export const DateRangePickerRoot: DateRangePickerParts["Root"] = dateRange.Root;
export const DateRangePickerInput: DateRangePickerParts["Input"] =
  dateRange.Input;
export const DateRangePickerTrigger: DateRangePickerParts["Trigger"] =
  dateRange.Trigger;
export const DateRangePickerContent: DateRangePickerParts["Content"] =
  dateRange.Content;
export const DateRangePickerPanel: DateRangePickerParts["Panel"] =
  dateRange.Panel;
export const DateRangePicker: DateRangePickerParts = {
  Root: dateRange.Root,
  Input: dateRange.Input,
  Trigger: dateRange.Trigger,
  Content: dateRange.Content,
  Panel: dateRange.Panel,
};

export const TimePickerRoot: TimePickerParts["Root"] = time.Root;
export const TimePickerInput: TimePickerParts["Input"] = time.Input;
export const TimePickerTrigger: TimePickerParts["Trigger"] = time.Trigger;
export const TimePickerContent: TimePickerParts["Content"] = time.Content;
export const TimePickerPanel: TimePickerParts["Panel"] = time.Panel;
export const TimePicker: TimePickerParts = {
  Root: time.Root,
  Input: time.Input,
  Trigger: time.Trigger,
  Content: time.Content,
  Panel: time.Panel,
};

export const TimeRangePickerRoot: TimeRangePickerParts["Root"] = timeRange.Root;
export const TimeRangePickerInput: TimeRangePickerParts["Input"] =
  timeRange.Input;
export const TimeRangePickerTrigger: TimeRangePickerParts["Trigger"] =
  timeRange.Trigger;
export const TimeRangePickerContent: TimeRangePickerParts["Content"] =
  timeRange.Content;
export const TimeRangePickerPanel: TimeRangePickerParts["Panel"] =
  timeRange.Panel;
export const TimeRangePicker: TimeRangePickerParts = {
  Root: timeRange.Root,
  Input: timeRange.Input,
  Trigger: timeRange.Trigger,
  Content: timeRange.Content,
  Panel: timeRange.Panel,
};

export const DateTimePickerRoot: DateTimePickerParts["Root"] = dateTime.Root;
export const DateTimePickerInput: DateTimePickerParts["Input"] = dateTime.Input;
export const DateTimePickerTrigger: DateTimePickerParts["Trigger"] =
  dateTime.Trigger;
export const DateTimePickerContent: DateTimePickerParts["Content"] =
  dateTime.Content;
export const DateTimePickerPanel: DateTimePickerParts["Panel"] = dateTime.Panel;
export const DateTimePicker: DateTimePickerParts = {
  Root: dateTime.Root,
  Input: dateTime.Input,
  Trigger: dateTime.Trigger,
  Content: dateTime.Content,
  Panel: dateTime.Panel,
};

export const DateTimeRangePickerRoot: DateTimeRangePickerParts["Root"] =
  dateTimeRange.Root;
export const DateTimeRangePickerInput: DateTimeRangePickerParts["Input"] =
  dateTimeRange.Input;
export const DateTimeRangePickerTrigger: DateTimeRangePickerParts["Trigger"] =
  dateTimeRange.Trigger;
export const DateTimeRangePickerContent: DateTimeRangePickerParts["Content"] =
  dateTimeRange.Content;
export const DateTimeRangePickerPanel: DateTimeRangePickerParts["Panel"] =
  dateTimeRange.Panel;
export const DateTimeRangePicker: DateTimeRangePickerParts = {
  Root: dateTimeRange.Root,
  Input: dateTimeRange.Input,
  Trigger: dateTimeRange.Trigger,
  Content: dateTimeRange.Content,
  Panel: dateTimeRange.Panel,
};
