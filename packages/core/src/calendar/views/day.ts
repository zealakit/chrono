import {
  type DateRange,
  type DayOfWeek,
  type GridDay,
  type PlainDate,
  compare,
  dayOfWeek,
  eachDay,
  type WeekInfo,
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
  /** Overrides what counts as `inRange`; `null` means nothing is (Mini Calendar without sync). */
  inRangeOf?: DateRange | null;
  focusedDate: PlainDate;
  hiddenDays: readonly DayOfWeek[];
  min?: PlainDate;
  max?: PlainDate;
  selectedDate?: PlainDate;
  isHighlighted?: (date: PlainDate) => boolean;
  isMarked?: (date: PlainDate) => boolean;
};

/** Outside `min` / `max`. */
export function isOutside(
  date: PlainDate,
  min?: PlainDate,
  max?: PlainDate,
): boolean {
  return (
    (min !== undefined && compare(date, min) < 0) ||
    (max !== undefined && compare(date, max) > 0)
  );
}

export function makeDay(grid: GridDay, ctx: DayContext): CalendarDay {
  const { date } = grid;
  return {
    ...grid,
    key: toIsoString(date),
    inRange:
      ctx.inRangeOf === null
        ? false
        : isDateInRange(date, ctx.inRangeOf ?? ctx.range),
    hidden: ctx.hiddenDays.includes(grid.dayOfWeek),
    disabled: isOutside(date, ctx.min, ctx.max),
    focused: isSameDay(date, ctx.focusedDate),
    selected:
      ctx.selectedDate !== undefined && isSameDay(date, ctx.selectedDate),
    highlighted: ctx.isHighlighted?.(date) ?? false,
    marked: ctx.isMarked?.(date) ?? false,
  };
}

/** Every visible (not hidden) day of `ctx.range`, as the time grid and the agenda list them. */
export function visibleDays(
  ctx: DayContext & { weekInfo: Pick<WeekInfo, "weekend">; today: PlainDate },
): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (const date of eachDay(ctx.range)) {
    const weekday = dayOfWeek(date);
    const day = makeDay(
      {
        date,
        dayOfWeek: weekday,
        outsideMonth: false,
        weekend: ctx.weekInfo.weekend.includes(weekday),
        today: isSameDay(date, ctx.today),
      },
      ctx,
    );
    if (!day.hidden) days.push(day);
  }
  return days;
}
