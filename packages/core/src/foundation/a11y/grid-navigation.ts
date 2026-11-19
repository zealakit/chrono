import {
  addDays,
  addMonths,
  addYears,
  endOfWeek,
  plainDate,
  startOfWeek,
} from "../values/plain-date.js";
import { compare } from "../values/compare.js";
import type { DayOfWeek, PlainDate } from "../values/types.js";

export type GridNavKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Home"
  | "End"
  | "PageUp"
  | "PageDown";

export type GridNavContext = {
  weekStartsOn: DayOfWeek;
  direction: "ltr" | "rtl";
  min?: PlainDate;
  max?: PlainDate;
  level: "day" | "month" | "year";
  /** Cells per row of the month and year grids (default 4). */
  columns?: number;
};

function clamp(date: PlainDate, ctx: GridNavContext): PlainDate {
  if (ctx.min && compare(date, ctx.min) < 0) {
    return ctx.min;
  }
  if (ctx.max && compare(date, ctx.max) > 0) {
    return ctx.max;
  }
  return date;
}

/** `addDays` and friends throw outside years 1-9999; pin to the bounds instead. */
function safely(move: () => PlainDate, towardsEnd: boolean): PlainDate {
  try {
    return move();
  } catch {
    return towardsEnd ? plainDate(9999, 12, 31) : plainDate(1, 1, 1);
  }
}

/**
 * Pure key to next-focus mapping for a date grid. It never touches the DOM.
 * Disabled dates are not skipped: they stay focusable (APG, D14). Results are
 * clamped to `min` and `max`.
 */
export function nextFocusedDate(
  current: PlainDate,
  key: GridNavKey,
  modifiers: { shift: boolean },
  ctx: GridNavContext,
): PlainDate {
  const rtl = ctx.direction === "rtl";
  const columns = ctx.columns ?? 4;
  const horizontal =
    key === "ArrowLeft"
      ? rtl
        ? 1
        : -1
      : key === "ArrowRight"
        ? rtl
          ? -1
          : 1
        : 0;
  const vertical = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  const page = key === "PageUp" ? -1 : key === "PageDown" ? 1 : 0;
  const forward = horizontal > 0 || vertical > 0 || page > 0 || key === "End";

  const move = (): PlainDate => {
    if (ctx.level === "day") {
      if (horizontal) return addDays(current, horizontal);
      if (vertical) return addDays(current, vertical * 7);
      if (key === "Home") return startOfWeek(current, ctx.weekStartsOn);
      if (key === "End") return endOfWeek(current, ctx.weekStartsOn);
      return modifiers.shift
        ? addYears(current, page)
        : addMonths(current, page);
    }
    if (ctx.level === "month") {
      if (horizontal) return addMonths(current, horizontal);
      if (vertical) return addMonths(current, vertical * columns);
      if (key === "Home")
        return plainDate(current.year, 1, current.day, {
          overflow: "constrain",
        });
      if (key === "End")
        return plainDate(current.year, 12, current.day, {
          overflow: "constrain",
        });
      return addYears(current, modifiers.shift ? page * 10 : page);
    }
    if (horizontal) return addYears(current, horizontal);
    if (vertical) return addYears(current, vertical * columns);
    const decade = Math.floor(current.year / 10) * 10;
    if (key === "Home")
      return plainDate(Math.max(decade, 1), current.month, current.day, {
        overflow: "constrain",
      });
    if (key === "End")
      return plainDate(Math.min(decade + 9, 9999), current.month, current.day, {
        overflow: "constrain",
      });
    return addYears(current, page * (modifiers.shift ? 100 : 10));
  };

  return clamp(safely(move, forward), ctx);
}
