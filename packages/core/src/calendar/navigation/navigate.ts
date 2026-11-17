import {
  type DateRange,
  type DayOfWeek,
  type PlainDate,
  addDays,
  addMonths,
  addWeeks,
  clampDate,
  compare,
  dateRangeLength,
  dayOfWeek,
  fromEpochDay,
  isDateInRange,
  toEpochDay,
} from "../../foundation/index.js";
import { getRange } from "./range.js";
import { type ViewDefinition, resolveView } from "./view-definition.js";

export type NavigationState = {
  view: string;
  /** The date the visible range is built around. */
  anchor: PlainDate;
  focusedDate: PlainDate;
  /** Ad-hoc definition made by `{ range }` navigation (`setRange`). */
  custom?: ViewDefinition;
};

export type NavigationContext = {
  views: Record<string, ViewDefinition>;
  weekStartsOn: DayOfWeek;
  hiddenDays: readonly DayOfWeek[];
  min?: PlainDate;
  max?: PlainDate;
  today: PlainDate;
};

export type NavigationAction =
  | "prev"
  | "next"
  | "today"
  | { goTo: PlainDate }
  | { view: string }
  | { range: DateRange };

export function getDefinition(
  state: NavigationState,
  ctx: NavigationContext,
): ViewDefinition {
  return state.custom ?? resolveView(ctx.views, state.view);
}

export function getHiddenDays(
  definition: ViewDefinition,
  ctx: NavigationContext,
): DayOfWeek[] {
  return [...new Set([...(definition.hiddenDays ?? []), ...ctx.hiddenDays])];
}

function shift(
  date: PlainDate,
  definition: ViewDefinition,
  sign: 1 | -1,
): PlainDate {
  const { days, weeks, months } = definition.length;
  if (months !== undefined) return addMonths(date, sign * months);
  if (weeks !== undefined) return addWeeks(date, sign * weeks);
  return addDays(date, sign * (days ?? 1));
}

function clampToBounds(date: PlainDate, ctx: NavigationContext): PlainDate {
  let result = date;
  if (ctx.min && compare(result, ctx.min) < 0) result = ctx.min;
  if (ctx.max && compare(result, ctx.max) > 0) result = ctx.max;
  return result;
}

/** First non-hidden day of the range (or the first day when all are hidden). */
export function firstVisibleDay(
  range: DateRange,
  hidden: readonly DayOfWeek[],
): PlainDate {
  const last = toEpochDay(range.end);
  for (
    let day = toEpochDay(range.start);
    day <= last && day < toEpochDay(range.start) + 14;
    day += 1
  ) {
    const date = fromEpochDay(day);
    if (!hidden.includes(dayOfWeek(date))) return date;
  }
  return range.start;
}

/** Keep the focus where it is when possible; otherwise use a visible day of the new range. */
function settleFocus(
  focused: PlainDate,
  range: DateRange,
  hidden: readonly DayOfWeek[],
  ctx: NavigationContext,
): PlainDate {
  if (isDateInRange(focused, range) && !hidden.includes(dayOfWeek(focused))) {
    return clampToBounds(focused, ctx);
  }
  const candidate = isDateInRange(focused, range)
    ? firstVisibleDay(range, hidden)
    : clampDate(focused, range);
  return clampToBounds(
    hidden.includes(dayOfWeek(candidate))
      ? firstVisibleDay(range, hidden)
      : candidate,
    ctx,
  );
}

/** Can the range move one step toward the past (`-1`) or future (`1`) within `min` / `max`? (C10) */
export function canNavigate(
  state: NavigationState,
  direction: 1 | -1,
  ctx: NavigationContext,
): boolean {
  const range = getRange(getDefinition(state, ctx), state.anchor, ctx);
  if (direction === -1) {
    return ctx.min === undefined || compare(range.start, ctx.min) > 0;
  }
  return ctx.max === undefined || compare(range.end, ctx.max) < 0;
}

/** Pure navigation: returns the next state. Clamps to `min` / `max`. */
export function navigate(
  state: NavigationState,
  action: NavigationAction,
  ctx: NavigationContext,
): NavigationState {
  const definition = getDefinition(state, ctx);

  if (action === "prev" || action === "next") {
    const sign = action === "prev" ? -1 : 1;
    if (!canNavigate(state, sign, ctx)) {
      return state;
    }
    const anchor = clampToBounds(shift(state.anchor, definition, sign), ctx);
    const range = getRange(definition, anchor, ctx);
    const focused = settleFocus(
      shift(state.focusedDate, definition, sign),
      range,
      getHiddenDays(definition, ctx),
      ctx,
    );
    return { ...state, anchor, focusedDate: focused };
  }

  if (action === "today") {
    const anchor = clampToBounds(ctx.today, ctx);
    return { ...state, anchor, focusedDate: anchor };
  }

  if ("goTo" in action) {
    const anchor = clampToBounds(action.goTo, ctx);
    return { ...state, anchor, focusedDate: anchor };
  }

  if ("view" in action) {
    const next = resolveView(ctx.views, action.view);
    const range = getRange(next, state.anchor, ctx);
    const focused = settleFocus(
      state.focusedDate,
      range,
      getHiddenDays(next, ctx),
      ctx,
    );
    return { view: action.view, anchor: state.anchor, focusedDate: focused };
  }

  const length = dateRangeLength(action.range);
  const custom: ViewDefinition = {
    ...definition,
    id: "custom",
    length: { days: length },
    align: "day",
    months: undefined,
  };
  const anchor = clampToBounds(action.range.start, ctx);
  return {
    view: "custom",
    custom,
    anchor,
    focusedDate: settleFocus(
      state.focusedDate,
      getRange(custom, anchor, ctx),
      getHiddenDays(custom, ctx),
      ctx,
    ),
  };
}
