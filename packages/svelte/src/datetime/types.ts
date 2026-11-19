import type {
  DateTimeInputOptions,
  DateTimeInputState,
  DateTimePanelOptions,
  DateTimeRangeInputOptions,
  DateTimeRangePanelOptions,
  DateTimeRangeValue,
  DateTimeSegmentView,
  DateTimeValue,
} from "@zealakit/chrono-core/datetime";
import type { Snippet } from "svelte";
import type {
  HTMLAttributes,
  HTMLButtonAttributes,
  HTMLInputAttributes,
} from "svelte/elements";

type Without<T, K> = Omit<T, keyof K | "children">;

export type DateTimePanelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DateTimePanelOptions
> &
  Omit<DateTimePanelOptions, "value"> & {
    /** Use `bind:value` to control the date-time. */
    value?: DateTimeValue;
    children?: Snippet;
  };

export type DateTimeRangePanelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DateTimeRangePanelOptions
> &
  Omit<DateTimeRangePanelOptions, "value"> & {
    value?: DateTimeRangeValue;
    children?: Snippet;
  };

export type DateTimeInputProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DateTimeInputOptions
> &
  Omit<DateTimeInputOptions, "value"> & {
    value?: DateTimeValue;
    children?: Snippet<[DateTimeInputState]>;
  };

export type DateTimeRangeInputProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DateTimeRangeInputOptions
> &
  Omit<DateTimeRangeInputOptions, "value"> & {
    value?: DateTimeRangeValue;
    children?: Snippet;
  };

export type DateTimeRangeInputFieldProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet<[DateTimeInputState]>;
};
export type DateTimeInputSegmentProps = Without<
  HTMLAttributes<HTMLSpanElement>,
  object
> & {
  segment: DateTimeSegmentView;
  children?: Snippet<[DateTimeSegmentView]>;
};
export type DateTimeInputFieldProps = Without<HTMLInputAttributes, object>;
export type DateTimeButtonProps = Without<HTMLButtonAttributes, object> & {
  children?: Snippet;
};
export type DateTimeContainerProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet;
};
export type DateTimeTimeZoneProps = Without<
  HTMLAttributes<HTMLSpanElement>,
  object
> & {
  children?: Snippet<[string]>;
};
