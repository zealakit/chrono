import {
  type PlainDate,
  type PlainTime,
  toPlainDateTime,
  plainDate,
  plainTime,
} from "../../foundation/index.js";
import { parseDate } from "../../date/index.js";
import { dayPeriodOf, parseTime } from "../../time/index.js";

export type DateTimeParseContext = {
  locale?: string;
  /** The display zone; an ISO string with an offset or `Z` is converted into it. */
  timeZone?: string;
  today?: PlainDate;
};

/** `date` and `time` are `null` when the text holds only the other one (plan 08 §13.2). */
export type DateTimeParseResult =
  | { date: PlainDate | null; time: PlainTime | null }
  | { error: "empty" | "unparseable" | "invalid" };

const fail = (error: string): { error: "unparseable" | "invalid" } => ({
  error:
    error === "invalid" || error === "invalid-date" ? "invalid" : "unparseable",
});

const ISO =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)(Z|[+-]\d{2}:?\d{2})?$/;
const TIME_TAIL = /(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*([^\d\s:]+\.?))?\s*$/u;
const HOUR_TAIL = /(\d{1,2})\s*([^\d\s:]+\.?)\s*$/u;

/**
 * Split pasted text into a date and a time and parse each with the Date and Time
 * parsers: ISO with `T`, `17/11/2026 9:30`, `Nov 17, 2026 9:30 PM`, a bare date or a
 * bare time. Built on `date/` and `time/` only.
 */
export function parseDateTime(
  text: string,
  context: DateTimeParseContext = {},
): DateTimeParseResult {
  const trimmed = text.trim();
  if (trimmed === "") return { error: "empty" };

  const iso = ISO.exec(trimmed);
  if (iso) {
    try {
      const wall = toPlainDateTime(
        iso[3] ? `${iso[1]}T${iso[2]}${iso[3]}` : `${iso[1]}T${iso[2]}`,
        context.timeZone ?? "UTC",
      );
      return {
        date: plainDate(wall.year, wall.month, wall.day),
        time: plainTime(wall.hour, wall.minute, wall.second),
      };
    } catch {
      return { error: "invalid" };
    }
  }

  let datePart = trimmed;
  let timePart = "";
  const withColon = TIME_TAIL.exec(trimmed);
  const hourOnly = HOUR_TAIL.exec(trimmed);
  if (
    withColon &&
    (!withColon[2] || dayPeriodOf(withColon[2], context.locale))
  ) {
    timePart = withColon[0];
    datePart = trimmed.slice(0, withColon.index);
  } else if (hourOnly && dayPeriodOf(hourOnly[2] as string, context.locale)) {
    timePart = hourOnly[0];
    datePart = trimmed.slice(0, hourOnly.index);
  }
  datePart = datePart.replace(/[\s,]+(at)?[\s,]*$/i, "").trim();

  if (timePart === "") {
    const date = parseDate(datePart, context);
    return "date" in date ? { date: date.date, time: null } : fail(date.error);
  }
  const time = parseTime(timePart, { locale: context.locale });
  if (!("time" in time)) return fail(time.error);
  if (datePart === "") return { date: null, time: time.time };
  const date = parseDate(datePart, context);
  return "date" in date
    ? { date: date.date, time: time.time }
    : fail(date.error);
}
