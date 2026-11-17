import {
  type DateRange,
  formatDateRangeToParts,
  formatDateToParts,
  isSameDay,
  isSameMonth,
} from "../../foundation/index.js";
import type { ViewDefinition } from "./view-definition.js";

export type CalendarTitle = { text: string; parts: Intl.DateTimeFormatPart[] };

const join = (parts: Intl.DateTimeFormatPart[]): string =>
  parts.map((part) => part.value).join("");

/**
 * Title of a range: "November 2026" for one month, "Nov 2026 - Jan 2027" for
 * several, "Tuesday, November 17, 2026" for one day, "Nov 16 - 22, 2026" for
 * a span of days. `parts` lets apps style pieces.
 */
export function getCalendarTitle(
  range: DateRange,
  definition: ViewDefinition,
  locale?: string,
): CalendarTitle {
  let parts: Intl.DateTimeFormatPart[];
  const wholeMonths =
    definition.layout === "month" && definition.length.months !== undefined;
  if (wholeMonths && isSameMonth(range.start, range.end)) {
    parts = formatDateToParts(range.start, locale, {
      month: "long",
      year: "numeric",
    });
  } else if (wholeMonths) {
    parts = formatDateRangeToParts(range, locale, {
      month: "short",
      year: "numeric",
    });
  } else if (isSameDay(range.start, range.end)) {
    parts = formatDateToParts(range.start, locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } else {
    parts = formatDateRangeToParts(range, locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return { text: join(parts), parts };
}
