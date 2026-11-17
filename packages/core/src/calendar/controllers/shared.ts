import {
  type Attributes,
  type DateInput,
  type DayOfWeek,
  type GridNavContext,
  type GridNavKey,
  type Messages,
  type PlainDate,
  type WeekdayHeader,
  dayOfWeek,
  formatMessage,
  getDateLabel,
  getGlobalState,
  nextFocusedDate,
  toIsoString,
  toPlainDate,
} from "../../foundation/index.js";
import type { CalendarDay } from "../views/day.js";

/** Counter shared by every copy of core on the page. Adapters pass framework ids for SSR. */
export function nextId(prefix: string): string {
  const state = getGlobalState("calendar-ids", () => ({ count: 0 }));
  state.count += 1;
  return `${prefix}-${state.count}`;
}

export type Modifiers = { shift: boolean; ctrl: boolean; meta: boolean };

const NAV_KEYS = new Set<string>([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export const isNavKey = (key: string): key is GridNavKey => NAV_KEYS.has(key);

/** Next focus in a month grid, skipping hidden weekdays. */
export function moveInMonthGrid(
  current: PlainDate,
  key: GridNavKey,
  shift: boolean,
  ctx: GridNavContext,
  hidden: readonly DayOfWeek[],
): PlainDate {
  let candidate = nextFocusedDate(current, key, { shift }, ctx);
  for (
    let guard = 0;
    guard < 14 && hidden.includes(dayOfWeek(candidate));
    guard += 1
  ) {
    candidate = nextFocusedDate(candidate, key, { shift }, ctx);
  }
  return candidate;
}

/** Attributes every day element shares (cells, time-grid headers, agenda days). */
export function dayAttributes(
  day: CalendarDay,
  role: string,
  options: { locale?: string; messages: Messages; extraLabel?: string },
): Attributes {
  const label = getDateLabel(
    day.date,
    options.locale,
    { today: day.today, selected: day.selected, disabled: day.disabled },
    options.messages,
  );
  return {
    role,
    "aria-label": options.extraLabel
      ? `${label}, ${options.extraLabel}`
      : label,
    "aria-current": day.today ? "date" : undefined,
    "aria-disabled": day.disabled ? "true" : undefined,
    tabindex: day.focused ? 0 : -1,
    "data-chrono-key": day.key,
    "data-today": day.today,
    "data-weekend": day.weekend,
    "data-disabled": day.disabled,
    "data-focused": day.focused,
    "data-selected": day.selected,
    "data-highlighted": day.highlighted,
  };
}

export function cellAttributes(
  day: CalendarDay,
  options: { locale?: string; messages: Messages; extraLabel?: string },
): Attributes {
  return {
    ...dayAttributes(day, "gridcell", options),
    "data-outside-month": day.outsideMonth,
    "data-hidden": day.hidden,
  };
}

export function columnHeaderAttributes(header: WeekdayHeader): Attributes {
  return {
    role: "columnheader",
    abbr: header.long,
    "data-weekend": header.weekend,
  };
}

export function weekNumberAttributes(
  weekNumber: number,
  messages: Messages,
): Attributes {
  return {
    role: "rowheader",
    "aria-label": formatMessage(messages.weekNumber, { number: weekNumber }),
  };
}

/** `highlightedDates` as a predicate: an array of dates, or the app's own function. */
export function toHighlighter(
  highlighted:
    | readonly DateInput[]
    | ((date: PlainDate) => boolean)
    | undefined,
  timeZone: string | undefined,
): ((date: PlainDate) => boolean) | undefined {
  if (typeof highlighted === "function" || highlighted === undefined)
    return highlighted;
  const keys = new Set(
    highlighted.map((value) => toIsoString(toPlainDate(value, timeZone))),
  );
  return (date) => keys.has(toIsoString(date));
}

export function navAttributes(label: string, disabled: boolean): Attributes {
  return {
    type: "button",
    "aria-label": label,
    "aria-disabled": disabled ? "true" : undefined,
    "data-disabled": disabled,
  };
}

export const keyOf = (date: PlainDate): string => toIsoString(date);
