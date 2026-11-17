import {
  type DateRange,
  type DayOfWeek,
  type GridDay,
  type PlainDate,
  compare,
  isDateInRange,
  isSameDay,
  toIsoString,
} from "../../foundation/index.js";

/** One rendered day. Adds calendar state to a foundation {@link GridDay}. */
export type CalendarDay = GridDay & {
  /** ISO date, used as `data-chrono-key`. */
  key: string;
  /** Inside the logical range (Mini Calendar: inside `syncWith.visibleRange`). */
  inRange: boolean;
  hidden: boolean;
  /** Outside `min` / `max`. */
  disabled: boolean;
  focused: boolean;
  /** Presentation only (C16): set by the app. */
  selected: boolean;
  highlighted: boolean;
  /** Mini Calendar `isMarked`. Always `false` in the main calendar. */
  marked: boolean;
};

export type DayContext = {
  range: DateRange;
  focusedDate: PlainDate;
  hiddenDays: readonly DayOfWeek[];
  min?: PlainDate;
  max?: PlainDate;
  selectedDate?: PlainDate;
  isHighlighted?: (date: PlainDate) => boolean;
  isMarked?: (date: PlainDate) => boolean;
};

export function makeDay(grid: GridDay, ctx: DayContext): CalendarDay {
  const { date } = grid;
  return {
    ...grid,
    key: toIsoString(date),
    inRange: isDateInRange(date, ctx.range),
    hidden: ctx.hiddenDays.includes(grid.dayOfWeek),
    disabled:
      (ctx.min !== undefined && compare(date, ctx.min) < 0) ||
      (ctx.max !== undefined && compare(date, ctx.max) > 0),
    focused: isSameDay(date, ctx.focusedDate),
    selected:
      ctx.selectedDate !== undefined && isSameDay(date, ctx.selectedDate),
    highlighted: ctx.isHighlighted?.(date) ?? false,
    marked: ctx.isMarked?.(date) ?? false,
  };
}
