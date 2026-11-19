import type {
  DateInputOptions,
  DateInputState,
  DatePanelOptions,
  DateRangeInputOptions,
  DateRangePanelOptions,
  DateRangeValue,
  DateValue,
  MultiDatePanelOptions,
  MultiDateValue,
  PanelCell,
  PanelDay,
  PanelLevel,
  SegmentView,
} from "@zealakit/chrono-core/date";
import type { WeekdayHeader } from "@zealakit/chrono-core/foundation";
import type { Snippet } from "svelte";
import type {
  HTMLAttributes,
  HTMLButtonAttributes,
  HTMLInputAttributes,
  HTMLTableAttributes,
  HTMLTdAttributes,
  HTMLThAttributes,
} from "svelte/elements";

type Without<T, K> = Omit<T, keyof K | "children">;
type Month = { year: number; month: number };
type Controlled = "value" | "visibleMonth" | "level";

type PanelBindings = {
  /** Use `bind:visibleMonth` to control the first visible month. */
  visibleMonth?: Month;
  /** Use `bind:level` to control the panel level. */
  level?: PanelLevel;
  children?: Snippet;
};

export type DatePanelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DatePanelOptions
> &
  Omit<DatePanelOptions, Controlled> &
  PanelBindings & {
    /** Use `bind:value` to control the date. */
    value?: DateValue;
  };

export type DateRangePanelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DateRangePanelOptions
> &
  Omit<DateRangePanelOptions, Controlled> &
  PanelBindings & {
    value?: DateRangeValue;
  };

export type MultiDatePanelProps = Without<
  HTMLAttributes<HTMLDivElement>,
  MultiDatePanelOptions
> &
  Omit<MultiDatePanelOptions, Controlled> &
  PanelBindings & {
    value?: MultiDateValue;
  };

export type DateInputProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DateInputOptions
> &
  Omit<DateInputOptions, "value"> & {
    /** Use `bind:value` to control the date. */
    value?: DateValue;
    children?: Snippet<[DateInputState]>;
  };

export type DateRangeInputProps = Without<
  HTMLAttributes<HTMLDivElement>,
  DateRangeInputOptions
> &
  Omit<DateRangeInputOptions, "value"> & {
    value?: DateRangeValue;
    children?: Snippet;
  };

export type DateRangeInputFieldProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet<[DateInputState]>;
};

export type DateInputSegmentProps = Without<
  HTMLAttributes<HTMLSpanElement>,
  object
> & {
  segment: SegmentView;
  children?: Snippet<[SegmentView]>;
};
export type DateInputLiteralProps = Without<
  HTMLAttributes<HTMLSpanElement>,
  object
> & {
  segment: SegmentView;
  children?: Snippet;
};
export type DateInputTextFieldProps = Without<HTMLInputAttributes, object>;
export type DateButtonProps = Without<HTMLButtonAttributes, object> & {
  children?: Snippet;
};
export type DatePanelTitleProps = Without<
  HTMLAttributes<HTMLHeadingElement>,
  object
> & {
  children?: Snippet;
};
export type DatePanelWeekdayHeaderProps = Without<HTMLThAttributes, object> & {
  header: WeekdayHeader;
  children?: Snippet;
};
export type DatePanelWeekNumberProps = Without<HTMLThAttributes, object> & {
  weekNumber: number;
  children?: Snippet;
};
export type DatePanelCellProps = Without<HTMLTdAttributes, object> & {
  day?: PanelDay;
  cell?: PanelCell;
  children?: Snippet;
};
export type DatePanelGridProps = Without<HTMLTableAttributes, object> & {
  /** Index of the month grid in a multi-month panel. */
  month?: number;
  /** Content of each day cell. Defaults to the day number. */
  children?: Snippet<[PanelDay]>;
};
