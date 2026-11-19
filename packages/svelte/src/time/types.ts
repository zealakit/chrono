import type {
  BookingSlot,
  TimeInputOptions,
  TimeInputState,
  TimePanelColumnState,
  TimePanelGroupState,
  TimePanelOptionState,
  TimePanelOptions,
  TimeRangeInputOptions,
  TimeRangePanelOptions,
  TimeRangeValue,
  TimeSegmentView,
  TimeValue,
} from "@zealakit/chrono-core/time";
import type { Snippet } from "svelte";
import type {
  HTMLAttributes,
  HTMLButtonAttributes,
  HTMLInputAttributes,
} from "svelte/elements";

type Without<T, K> = Omit<T, keyof K | "children">;

export type TimePanelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  TimePanelOptions
> &
  Omit<TimePanelOptions, "value"> & {
    /** Use `bind:value` to control the time. */
    value?: TimeValue;
    children?: Snippet;
  };

export type TimeRangePanelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  TimeRangePanelOptions
> &
  Omit<TimeRangePanelOptions, "value"> & {
    value?: TimeRangeValue;
    children?: Snippet;
  };

export type TimeInputProps = Without<
  HTMLAttributes<HTMLDivElement>,
  TimeInputOptions
> &
  Omit<TimeInputOptions, "value"> & {
    /** Use `bind:value` to control the time. */
    value?: TimeValue;
    children?: Snippet<[TimeInputState]>;
  };

export type TimeRangeInputProps = Without<
  HTMLAttributes<HTMLDivElement>,
  TimeRangeInputOptions
> &
  Omit<TimeRangeInputOptions, "value"> & {
    value?: TimeRangeValue;
    children?: Snippet;
  };

export type TimeRangeInputFieldProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet<[TimeInputState]>;
};
export type TimeInputSegmentProps = Without<
  HTMLAttributes<HTMLSpanElement>,
  object
> & {
  segment: TimeSegmentView;
  children?: Snippet<[TimeSegmentView]>;
};
export type TimeInputLiteralProps = Without<
  HTMLAttributes<HTMLSpanElement>,
  object
> & {
  segment: TimeSegmentView;
  children?: Snippet;
};
export type TimeInputTextFieldProps = Without<HTMLInputAttributes, object>;
export type TimeButtonProps = Without<HTMLButtonAttributes, object> & {
  children?: Snippet;
};

export type TimePanelOptionProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  option: TimePanelOptionState;
  /** Receives the option and, in slot mode, the app's slot (with its `data`). */
  children?: Snippet<[TimePanelOptionState, BookingSlot | undefined]>;
};
export type TimePanelColumnProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  column: TimePanelColumnState;
  children?: Snippet<[TimePanelColumnState]>;
};
export type TimePanelGroupProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  group: TimePanelGroupState;
  children?: Snippet;
};
export type TimePanelGroupLabelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet;
};
export type TimePanelListProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet<[TimePanelGroupState[]]>;
};
export type TimeRangePanelSetProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet;
};
