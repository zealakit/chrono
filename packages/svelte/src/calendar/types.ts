import type {
  CalendarDay,
  CalendarOptions,
  CalendarTitle,
  MiniCalendarOptions,
} from "@zealakit/chrono-core/calendar";
import type {
  DateInput,
  TimeSlot,
  WeekdayHeader,
} from "@zealakit/chrono-core/foundation";
import type { Snippet } from "svelte";
import type {
  HTMLAttributes,
  HTMLButtonAttributes,
  HTMLLiAttributes,
  HTMLTableAttributes,
  HTMLTdAttributes,
  HTMLThAttributes,
} from "svelte/elements";

type Without<T, K> = Omit<T, keyof K | "children">;

export type CalendarProps = Without<
  HTMLAttributes<HTMLDivElement>,
  CalendarOptions
> &
  Omit<CalendarOptions, "view" | "date"> & {
    /** Use `bind:view` to control the view. */
    view?: string;
    /** Use `bind:date` to control the date the range is built around. */
    date?: DateInput;
    children?: Snippet;
  };

export type MiniCalendarProps = Without<
  HTMLAttributes<HTMLDivElement>,
  MiniCalendarOptions
> &
  Omit<MiniCalendarOptions, "month"> & {
    /** Use `bind:month` to control the visible month. */
    month?: { year: number; month: number };
    children?: Snippet;
  };

export type TitleProps = Without<HTMLAttributes<HTMLHeadingElement>, object> & {
  children?: Snippet<[CalendarTitle]>;
};
export type MiniTitleProps = Without<
  HTMLAttributes<HTMLHeadingElement>,
  object
> & {
  children?: Snippet;
};
export type ButtonProps = Without<HTMLButtonAttributes, object> & {
  children?: Snippet;
};
export type ViewButtonProps = ButtonProps & { view: string };
export type WeekdayHeaderProps = Without<HTMLThAttributes, object> & {
  header: WeekdayHeader;
  children?: Snippet;
};
export type WeekNumberProps = Without<HTMLThAttributes, object> & {
  weekNumber: number;
  children?: Snippet;
};
export type CellProps = Without<HTMLTdAttributes, object> & {
  day: CalendarDay;
  children?: Snippet;
};
export type MonthGridProps = Without<HTMLTableAttributes, object> & {
  /** Index of the month grid in a multi-month view. */
  month?: number;
  /** Content of each day cell. Defaults to the day number. */
  children?: Snippet<[CalendarDay]>;
};
export type MiniGridProps = Without<HTMLTableAttributes, object> & {
  children?: Snippet<[CalendarDay]>;
};
export type TimeGridProps = Without<HTMLAttributes<HTMLDivElement>, object> & {
  children?: Snippet<[{ days: CalendarDay[]; slots: TimeSlot[] }]>;
};
export type TimeGridColumnHeaderProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  day: CalendarDay;
  children?: Snippet;
};
export type TimeGridSlotProps = Omit<
  Without<HTMLAttributes<HTMLDivElement>, object>,
  "slot"
> & {
  slot: TimeSlot;
  day: CalendarDay;
  children?: Snippet;
};
export type AgendaProps = Without<HTMLAttributes<HTMLUListElement>, object> & {
  children?: Snippet<[CalendarDay[]]>;
};
export type AgendaDayProps = Without<HTMLLiAttributes, object> & {
  day: CalendarDay;
  children?: Snippet;
};

export type CalendarEventsProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  /** The cell whose events this list renders. */
  day: CalendarDay;
  children?: Snippet<[import("./use-calendar.js").EventSegment[]]>;
};

export type CalendarEventProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  segment: import("./use-calendar.js").EventSegment;
  children?: Snippet;
};

export type CalendarMoreButtonProps = Without<HTMLButtonAttributes, object> & {
  day: CalendarDay;
  children?: Snippet;
};

export type CalendarAllDayRowProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  children?: Snippet<
    [
      {
        days: CalendarDay[];
        segments: import("@zealakit/chrono-core/calendar").AllDayRowSegment[];
      },
    ]
  >;
};

export type NowIndicatorProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & { children?: Snippet };

export type SelectionPreviewProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  day: CalendarDay;
  children?: Snippet;
};

export type CalendarEventResizeHandleProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  segment: import("./use-calendar.js").EventSegment;
  edge: "start" | "end";
  children?: Snippet;
};

export type CalendarEventDragPreviewProps = Without<
  HTMLAttributes<HTMLDivElement>,
  object
> & {
  /** The cell that hosts the preview pieces. */
  day: CalendarDay;
  /** Render the all-day row pieces of `day`. */
  allDay?: boolean;
  children?: Snippet<[import("./use-calendar.js").EventSegment]>;
};

type ResourceDiv = Without<HTMLAttributes<HTMLDivElement>, object>;

export type CalendarResourceHeaderProps = ResourceDiv & {
  column: import("@zealakit/chrono-core/calendar").ResourceColumn;
  children?: Snippet;
};
export type CalendarResourceGroupHeaderProps = ResourceDiv & {
  group: import("@zealakit/chrono-core/calendar").ResourceGroupHeader;
  children?: Snippet;
};
export type CalendarResourceGridProps = ResourceDiv & {
  children?: Snippet<
    [import("@zealakit/chrono-core/calendar").ResourceTimeGridLayout]
  >;
};
export type CalendarTimelineProps = ResourceDiv & {
  children?: Snippet<[import("@zealakit/chrono-core/calendar").TimelineLayout]>;
};
export type CalendarTimelineHeaderCellProps = ResourceDiv & {
  cell: import("@zealakit/chrono-core/calendar").TimelineHeaderCell;
  children?: Snippet;
};
export type CalendarTimelineRowProps = ResourceDiv & {
  row: import("@zealakit/chrono-core/calendar").TimelineRow;
  children?: Snippet;
};
export type CalendarTimelineCellProps = ResourceDiv & {
  row: import("@zealakit/chrono-core/calendar").TimelineRow;
  slot: import("@zealakit/chrono-core/calendar").TimelineSlot;
  children?: Snippet;
};
export type CalendarResourceEventProps = ResourceDiv & {
  piece: import("@zealakit/chrono-core/calendar").ResourcePieceLike<
    import("@zealakit/chrono-core/calendar").CalendarEventInput
  >;
  children?: Snippet;
};
