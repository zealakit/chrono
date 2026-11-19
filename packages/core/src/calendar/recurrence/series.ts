import {
  type DateRange,
  type DateTimeInput,
  type DateInput,
  type PlainDateTime,
  compare,
  fromDate,
  fromEpochDay,
  fromSecondOfDay,
  parseIsoDate,
  plainDate,
  plainDateTime,
  toEpochDay,
  toIsoString,
  toPlainDate,
  toPlainDateTime,
  toSecondOfDay,
} from "../../foundation/index.js";
import type { CalendarEventInput, EventId } from "../events/types.js";
import { normalizeEventInput } from "../events/normalize.js";
import { expandRule } from "./expand.js";
import { parseRRule } from "./rrule.js";
import type {
  RRule,
  RRuleError,
  RecurrenceInfo,
  RecurrenceOccurrence,
} from "./types.js";

const SECONDS_PER_DAY = 86400;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MIDNIGHT = { hour: 0, minute: 0, second: 0 } as const;

export type ExpandRecurrenceOptions = {
  /** Display zone. Defaults to `"UTC"`, never the host zone. */
  timeZone?: string;
  onError?: (error: RRuleError) => void;
};

const wallSeconds = (value: PlainDateTime): number =>
  toEpochDay(value) * SECONDS_PER_DAY + toSecondOfDay(value);

const fromWallSeconds = (seconds: number): PlainDateTime => {
  const day = Math.floor(seconds / SECONDS_PER_DAY);
  return plainDateTime(
    fromEpochDay(day),
    fromSecondOfDay(seconds - day * SECONDS_PER_DAY),
  );
};

/** A value as wall time in the display zone (all-day: midnight of the date). */
export function recurrenceWall(
  value: DateTimeInput | DateInput,
  allDay: boolean,
  timeZone: string,
): PlainDateTime {
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    return plainDateTime(parseIsoDate(value), MIDNIGHT);
  }
  if (typeof (value as { getTime?: unknown }).getTime === "function") {
    const zoned = fromDate(value as Date, timeZone);
    const date = plainDate(zoned.year, zoned.month, zoned.day);
    return allDay
      ? plainDateTime(date, MIDNIGHT)
      : plainDateTime(date, {
          hour: zoned.hour,
          minute: zoned.minute,
          second: zoned.second,
        });
  }
  if (allDay) {
    return plainDateTime(toPlainDate(value as DateInput, timeZone), MIDNIGHT);
  }
  return toPlainDateTime(value as DateTimeInput, timeZone);
}

export function isZonedStart(value: DateTimeInput | DateInput): boolean {
  if (typeof value === "string") {
    return /(?:Z|[+-]\d{2}:?\d{2})(?:\[[^\]]+\])?$/.test(value);
  }
  return typeof value === "object" && value !== null && "timeZone" in value;
}

function overlaps(
  start: PlainDateTime,
  end: PlainDateTime,
  range: DateRange,
): boolean {
  const from = plainDateTime(range.start, MIDNIGHT);
  const last = plainDateTime(range.end, {
    hour: 23,
    minute: 59,
    second: 59,
  });
  if (compare(start, end) === 0) {
    return compare(start, from) >= 0 && compare(start, last) <= 0;
  }
  return compare(start, last) <= 0 && compare(end, from) > 0;
}

function singleOccurrence<T extends CalendarEventInput>(
  series: T,
  start: PlainDateTime,
  end: PlainDateTime,
  allDay: boolean,
): RecurrenceOccurrence<T>[] {
  return [
    {
      event: series,
      start,
      end,
      allDay,
      key: `${String(series.id)}:${toIsoString(start)}`,
      recurrence: {
        recurringId: series.id,
        occurrenceStart: start,
        isOverride: false,
        series,
      },
    },
  ];
}

/**
 * Expand one series into the occurrences overlapping `range` (plan 12 RR4–RR5).
 * The series' `start` is DTSTART and its `start`/`end` distance is the duration.
 * EXDATE removes generated occurrences after COUNT; RDATE adds occurrences that
 * are not subject to COUNT or UNTIL.
 */
export function expandRecurrence<T extends CalendarEventInput>(
  series: T,
  range: DateRange,
  options: ExpandRecurrenceOptions = {},
): RecurrenceOccurrence<T>[] {
  if (series.rrule === undefined) {
    return [];
  }
  const timeZone = options.timeZone ?? "UTC";
  const parsed = normalizeEventInput(series, timeZone);
  const allDay = parsed.allDay;
  const zoned = isZonedStart(series.start);
  const durationSeconds = allDay
    ? 0
    : Math.max(0, wallSeconds(parsed.end) - wallSeconds(parsed.start));
  const durationDays = allDay
    ? Math.max(1, toEpochDay(parsed.end) - toEpochDay(parsed.start))
    : 0;

  let rule: RRule;
  try {
    rule = parseRRule(series.rrule);
  } catch (error) {
    options.onError?.(error as RRuleError);
    return overlaps(parsed.start, parsed.end, range)
      ? singleOccurrence(series, parsed.start, parsed.end, allDay)
      : [];
  }

  const exdates = new Set(
    (series.exdates ?? []).map((value) =>
      toIsoString(recurrenceWall(value, allDay, timeZone)),
    ),
  );
  const generated = expandRule(rule, {
    start: parsed.start,
    allDay,
    timeZone,
    zoned,
    durationSeconds,
    durationDays,
    range,
    onError: options.onError,
  });

  const occurrences = new Map<string, RecurrenceOccurrence<T>>();
  const startKey = (value: PlainDateTime) => toIsoString(value);
  const push = (start: PlainDateTime, end: PlainDateTime): void => {
    const key = startKey(start);
    if (occurrences.has(key) || exdates.has(key)) {
      return;
    }
    occurrences.set(key, {
      event: series,
      start,
      end,
      allDay,
      key: `${String(series.id)}:${key}`,
      recurrence: {
        recurringId: series.id,
        occurrenceStart: start,
        isOverride: false,
        series,
      },
    });
  };

  for (const occurrence of generated) {
    push(occurrence.start, occurrence.end);
  }

  for (const value of series.rdates ?? []) {
    const start = recurrenceWall(value, allDay, timeZone);
    const end = allDay
      ? plainDateTime(fromEpochDay(toEpochDay(start) + durationDays), MIDNIGHT)
      : fromWallSeconds(wallSeconds(start) + durationSeconds);
    if (overlaps(start, end, range)) {
      push(start, end);
    }
  }

  return [...occurrences.values()].sort((a, b) => compare(a.start, b.start));
}

/** The `(series id, original occurrence start)` an override replaces (RR6). */
export function overrideOf<T extends CalendarEventInput>(
  event: T,
  timeZone: string,
): { recurringId: EventId; occurrenceStart: PlainDateTime } | null {
  const input = event as {
    recurringId?: EventId;
    recurrenceId?: DateTimeInput | DateInput;
  };
  if (input.recurringId === undefined || input.recurrenceId === undefined) {
    return null;
  }
  const parsed = normalizeEventInput(event, timeZone);
  return {
    recurringId: input.recurringId,
    occurrenceStart: recurrenceWall(
      input.recurrenceId,
      parsed.allDay,
      timeZone,
    ),
  };
}

/** The recurrence data for an override piece (RR6/RR7). */
export function overrideInfo<T extends CalendarEventInput>(
  series: T,
  occurrenceStart: PlainDateTime,
): RecurrenceInfo<T> {
  return {
    recurringId: series.id,
    occurrenceStart,
    isOverride: true,
    series,
  };
}
