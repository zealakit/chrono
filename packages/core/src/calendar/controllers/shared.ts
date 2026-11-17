import {
  type Attributes,
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
    const further = nextFocusedDate(candidate, key, { shift }, ctx);
    if (
      further.year === candidate.year &&
      further.month === candidate.month &&
      further.day === candidate.day
    ) {
      break;
    }
    candidate = further;
  }
  return candidate;
}

export function cellAttributes(
  day: CalendarDay,
  options: {
    locale?: string;
    messages: Messages;
    extraLabel?: string;
    inRangeFlag?: boolean;
  },
): Attributes {
  const label = getDateLabel(
    day.date,
    options.locale,
    { today: day.today, selected: day.selected, disabled: day.disabled },
    options.messages,
  );
  return {
    role: "gridcell",
    "aria-label": options.extraLabel
      ? `${label}, ${options.extraLabel}`
      : label,
    "aria-current": day.today ? "date" : undefined,
    "aria-disabled": day.disabled ? "true" : undefined,
    tabindex: day.focused ? 0 : -1,
    "data-chrono-key": day.key,
    "data-today": day.today,
    "data-outside-month": day.outsideMonth,
    "data-weekend": day.weekend,
    "data-disabled": day.disabled,
    "data-focused": day.focused,
    "data-hidden": day.hidden,
    "data-selected": day.selected,
    "data-highlighted": day.highlighted,
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
    "data-week-number": weekNumber,
  };
}

export const keyOf = (date: PlainDate): string => toIsoString(date);
