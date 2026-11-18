import {
  DateInput,
  DatePanel,
  DateRangeInput,
  DateRangePanel,
} from "@zealakit/chrono-vue/date";
import {
  DateTimeInput,
  DateTimePanel,
  DateTimeRangeInput,
  DateTimeRangePanel,
} from "@zealakit/chrono-vue/datetime";
import {
  TimeInput,
  TimePanel,
  TimeRangeInput,
  TimeRangePanel,
} from "@zealakit/chrono-vue/time";
import { createPicker } from "./create-picker.js";

const date = createPicker({
  Input: DateInput,
  Panel: DatePanel,
  label: "Choose date",
});
const dateRange = createPicker({
  Input: DateRangeInput,
  Panel: DateRangePanel,
  label: "Choose dates",
});
const time = createPicker({
  Input: TimeInput,
  Panel: TimePanel,
  label: "Choose time",
});
const timeRange = createPicker({
  Input: TimeRangeInput,
  Panel: TimeRangePanel,
  label: "Choose times",
});
const dateTime = createPicker({
  Input: DateTimeInput,
  Panel: DateTimePanel,
  label: "Choose date and time",
});
const dateTimeRange = createPicker({
  Input: DateTimeRangeInput,
  Panel: DateTimeRangePanel,
  label: "Choose dates and times",
});

export const DatePickerRoot = date.Root;
export const DatePickerInput = date.Input;
export const DatePickerTrigger = date.Trigger;
export const DatePickerContent = date.Content;
export const DatePickerPanel = date.Panel;
export const DatePicker = {
  Root: date.Root,
  Input: date.Input,
  Trigger: date.Trigger,
  Content: date.Content,
  Panel: date.Panel,
};

export const DateRangePickerRoot = dateRange.Root;
export const DateRangePickerInput = dateRange.Input;
export const DateRangePickerTrigger = dateRange.Trigger;
export const DateRangePickerContent = dateRange.Content;
export const DateRangePickerPanel = dateRange.Panel;
export const DateRangePicker = {
  Root: dateRange.Root,
  Input: dateRange.Input,
  Trigger: dateRange.Trigger,
  Content: dateRange.Content,
  Panel: dateRange.Panel,
};

export const TimePickerRoot = time.Root;
export const TimePickerInput = time.Input;
export const TimePickerTrigger = time.Trigger;
export const TimePickerContent = time.Content;
export const TimePickerPanel = time.Panel;
export const TimePicker = {
  Root: time.Root,
  Input: time.Input,
  Trigger: time.Trigger,
  Content: time.Content,
  Panel: time.Panel,
};

export const TimeRangePickerRoot = timeRange.Root;
export const TimeRangePickerInput = timeRange.Input;
export const TimeRangePickerTrigger = timeRange.Trigger;
export const TimeRangePickerContent = timeRange.Content;
export const TimeRangePickerPanel = timeRange.Panel;
export const TimeRangePicker = {
  Root: timeRange.Root,
  Input: timeRange.Input,
  Trigger: timeRange.Trigger,
  Content: timeRange.Content,
  Panel: timeRange.Panel,
};

export const DateTimePickerRoot = dateTime.Root;
export const DateTimePickerInput = dateTime.Input;
export const DateTimePickerTrigger = dateTime.Trigger;
export const DateTimePickerContent = dateTime.Content;
export const DateTimePickerPanel = dateTime.Panel;
export const DateTimePicker = {
  Root: dateTime.Root,
  Input: dateTime.Input,
  Trigger: dateTime.Trigger,
  Content: dateTime.Content,
  Panel: dateTime.Panel,
};

export const DateTimeRangePickerRoot = dateTimeRange.Root;
export const DateTimeRangePickerInput = dateTimeRange.Input;
export const DateTimeRangePickerTrigger = dateTimeRange.Trigger;
export const DateTimeRangePickerContent = dateTimeRange.Content;
export const DateTimeRangePickerPanel = dateTimeRange.Panel;
export const DateTimeRangePicker = {
  Root: dateTimeRange.Root,
  Input: dateTimeRange.Input,
  Trigger: dateTimeRange.Trigger,
  Content: dateTimeRange.Content,
  Panel: dateTimeRange.Panel,
};
