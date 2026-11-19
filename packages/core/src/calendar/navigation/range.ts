import {
  type DateRange,
  type DayOfWeek,
  type PlainDate,
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  getMonths,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "../../foundation/index.js";
import {
  type ViewDefinition,
  type ViewLength,
  getMonthCount,
} from "./view-definition.js";

export type RangeContext = { weekStartsOn: DayOfWeek };

function alignStart(
  definition: ViewDefinition,
  anchor: PlainDate,
  ctx: RangeContext,
): PlainDate {
  switch (definition.align) {
    case "week":
      return startOfWeek(anchor, ctx.weekStartsOn);
    case "month":
      return startOfMonth(anchor);
    case "year":
      return startOfYear(anchor);
    default:
      return anchor;
  }
}

/** Move `date` forward (`1`) or backward (`-1`) by one view length. */
export function addLength(
  date: PlainDate,
  length: ViewLength,
  sign: 1 | -1,
): PlainDate {
  if (length.months !== undefined) return addMonths(date, sign * length.months);
  if (length.weeks !== undefined) return addWeeks(date, sign * length.weeks);
  return addDays(date, sign * (length.days ?? 1));
}

/** The logical period of a view around `anchor` (for example Nov 1-30). */
export function getRange(
  definition: ViewDefinition,
  anchor: PlainDate,
  ctx: RangeContext,
): DateRange {
  const start = alignStart(definition, anchor, ctx);
  const next = addLength(start, definition.length, 1);
  return { start, end: addDays(next, -1) };
}

/**
 * What is on screen: month layouts add the adjacent days that complete their
 * weeks. Hidden days stay inside the range (hidden, not removed), so fetching
 * is stable.
 */
export function getVisibleRange(
  definition: ViewDefinition,
  range: DateRange,
  ctx: RangeContext,
): DateRange {
  if (definition.layout !== "month") {
    return range;
  }
  if (definition.length.months === undefined) {
    return {
      start: startOfWeek(range.start, ctx.weekStartsOn),
      end: endOfWeek(range.end, ctx.weekStartsOn),
    };
  }
  const grids = getMonths(range.start, getMonthCount(definition), {
    weekStartsOn: ctx.weekStartsOn,
    fixedWeeks: definition.fixedWeeks,
  });
  const first = grids[0]?.weeks[0]?.days[0]?.date ?? range.start;
  const lastWeeks = grids[grids.length - 1]?.weeks ?? [];
  const last = lastWeeks[lastWeeks.length - 1]?.days[6]?.date ?? range.end;
  return { start: first, end: last };
}
