import {
  type DateRange,
  type DayOfWeek,
  type PlainDate,
  type PlainDateTime,
  type ZonedDateTime,
  addDays,
  compare,
  dayOfWeek,
  daysInMonth,
  fromEpochDay,
  fromSecondOfDay,
  plainDate,
  plainDateTime,
  startOfWeek,
  toEpochDay,
  toInstant,
  toSecondOfDay,
  toZoned,
} from "../../foundation/index.js";
import type { RRule, RRuleByDay, RRuleError } from "./types.js";
import { rruleError } from "./types.js";

const SECONDS_PER_DAY = 86400;
const DEFAULT_WKST: DayOfWeek = 1;
/** Iterations (periods), not produced occurrences (plan 12 §13.5). */
const ITERATION_CAP = 10_000;

export type RuleOccurrence = {
  start: PlainDateTime;
  end: PlainDateTime;
  allDay: boolean;
};

export type ExpandRuleOptions = {
  /** DTSTART wall time in the display zone. */
  start: PlainDateTime;
  allDay: boolean;
  timeZone: string;
  /** The series is zoned (wall time follows the zone, DST gaps use "compatible"). */
  zoned: boolean;
  /** Timed series: wall-time duration in seconds. */
  durationSeconds: number;
  /** All-day series: length in days (end is exclusive). */
  durationDays: number;
  range: DateRange;
  onError?: (error: RRuleError) => void;
};

const wallSeconds = (value: PlainDateTime): number =>
  toEpochDay(value) * SECONDS_PER_DAY + toSecondOfDay(value);

const fromWallSeconds = (seconds: number): PlainDateTime => {
  const day = Math.floor(seconds / SECONDS_PER_DAY);
  const rest = seconds - day * SECONDS_PER_DAY;
  return plainDateTime(fromEpochDay(day), fromSecondOfDay(rest));
};

const datePart = (value: PlainDateTime): PlainDate =>
  plainDate(value.year, value.month, value.day);

const datePartOf = (value: PlainDate): PlainDate =>
  plainDate(value.year, value.month, value.day);

const timePart = (value: PlainDateTime): PlainDateTime =>
  plainDateTime(plainDate(1970, 1, 1), {
    hour: value.hour,
    minute: value.minute,
    second: value.second,
  });

/** `2TU` / `-1FR` inside a month. */
function nthWeekday(
  year: number,
  month: number,
  day: DayOfWeek,
  ordinal: number,
): number | null {
  const limit = daysInMonth(year, month);
  if (ordinal > 0) {
    const offset = (day - dayOfWeek(plainDate(year, month, 1)) + 7) % 7;
    const result = 1 + offset + (ordinal - 1) * 7;
    return result <= limit ? result : null;
  }
  const offset = (dayOfWeek(plainDate(year, month, limit)) - day + 7) % 7;
  const result = limit - offset + (ordinal + 1) * 7;
  return result >= 1 ? result : null;
}

function dayMatchesByDay(
  year: number,
  month: number,
  day: number,
  entry: RRuleByDay,
): boolean {
  if (dayOfWeek(plainDate(year, month, day)) !== entry.day) {
    return false;
  }
  if (entry.ordinal === undefined) {
    return true;
  }
  if (entry.ordinal > 0) {
    const first = nthWeekday(year, month, entry.day, 1);
    return (
      first !== null && Math.floor((day - first) / 7) + 1 === entry.ordinal
    );
  }
  const last = nthWeekday(year, month, entry.day, -1);
  return last !== null && -Math.floor((last - day) / 7) - 1 === entry.ordinal;
}

/** Days of one month selected by BYMONTHDAY / BYDAY, or DTSTART's day. */
function daysInMonthFor(
  year: number,
  month: number,
  defaultDay: number,
  rule: RRule,
): number[] {
  const limit = daysInMonth(year, month);
  const result = new Set<number>();
  const byDay = rule.byDay;
  if (rule.byMonthDay !== undefined) {
    for (const entry of rule.byMonthDay) {
      const day = entry > 0 ? entry : limit + 1 + entry;
      if (
        day >= 1 &&
        day <= limit &&
        (!byDay ||
          byDay.some((item) => dayMatchesByDay(year, month, day, item)))
      ) {
        result.add(day);
      }
    }
    return [...result].sort((a, b) => a - b);
  }
  if (byDay !== undefined) {
    for (const entry of byDay) {
      if (entry.ordinal === undefined) {
        for (let day = 1; day <= limit; day += 1) {
          if (dayOfWeek(plainDate(year, month, day)) === entry.day) {
            result.add(day);
          }
        }
      } else {
        const day = nthWeekday(year, month, entry.day, entry.ordinal);
        if (day !== null) {
          result.add(day);
        }
      }
    }
    return [...result].sort((a, b) => a - b);
  }
  if (defaultDay <= limit) {
    result.add(defaultDay);
  }
  return [...result];
}

function matchesMonthFilters(date: PlainDate, rule: RRule): boolean {
  if (rule.byMonth !== undefined && !rule.byMonth.includes(date.month)) {
    return false;
  }
  if (rule.byMonthDay !== undefined) {
    const limit = daysInMonth(date.year, date.month);
    const days = rule.byMonthDay.map((entry) =>
      entry > 0 ? entry : limit + 1 + entry,
    );
    if (!days.includes(date.day)) {
      return false;
    }
  }
  if (rule.byDay !== undefined) {
    const weekday = dayOfWeek(date);
    if (!rule.byDay.some((entry) => entry.day === weekday)) {
      return false;
    }
  }
  return true;
}

type Period = { anchor: PlainDate; dates: PlainDate[] };

function periodOf(rule: RRule, startDate: PlainDate, index: number): Period {
  const interval = rule.interval ?? 1;
  if (rule.freq === "DAILY") {
    const date = addDays(startDate, index * interval);
    return {
      anchor: date,
      dates: matchesMonthFilters(date, rule) ? [date] : [],
    };
  }
  if (rule.freq === "WEEKLY") {
    const wkst = rule.wkst ?? DEFAULT_WKST;
    const weekStart = startOfWeek(startDate, wkst);
    const anchor = addDays(weekStart, index * interval * 7);
    const days: DayOfWeek[] =
      rule.byDay === undefined
        ? [dayOfWeek(startDate)]
        : rule.byDay.map((entry) => entry.day);
    const dates: PlainDate[] = [];
    for (const day of days) {
      const date = addDays(anchor, (day - wkst + 7) % 7);
      if (compare(date, startDate) < 0) {
        continue;
      }
      if (rule.byMonth !== undefined && !rule.byMonth.includes(date.month)) {
        continue;
      }
      if (rule.byMonthDay !== undefined) {
        const limit = daysInMonth(date.year, date.month);
        const wanted = rule.byMonthDay.map((entry) =>
          entry > 0 ? entry : limit + 1 + entry,
        );
        if (!wanted.includes(date.day)) {
          continue;
        }
      }
      dates.push(date);
    }
    dates.sort((a, b) => compare(a, b));
    return { anchor, dates };
  }
  if (rule.freq === "MONTHLY") {
    const index0 =
      startDate.year * 12 + (startDate.month - 1) + index * interval;
    const year = Math.floor(index0 / 12);
    const month = index0 - year * 12 + 1;
    const anchor = plainDate(year, month, 1);
    if (rule.byMonth !== undefined && !rule.byMonth.includes(month)) {
      return { anchor, dates: [] };
    }
    const dates = daysInMonthFor(year, month, startDate.day, rule).map((day) =>
      plainDate(year, month, day),
    );
    return { anchor, dates };
  }
  const year = startDate.year + index * interval;
  const months = rule.byMonth ?? [startDate.month];
  const dates: PlainDate[] = [];
  for (const month of months) {
    for (const day of daysInMonthFor(year, month, startDate.day, rule)) {
      dates.push(plainDate(year, month, day));
    }
  }
  dates.sort((a, b) => compare(a, b));
  return { anchor: plainDate(year, 1, 1), dates };
}

function pastUntil(
  candidate: PlainDateTime,
  rule: RRule,
  timeZone: string,
  zoned: boolean,
): boolean {
  const until = rule.until;
  if (until === undefined) {
    return false;
  }
  if ((until as { hour?: number }).hour === undefined) {
    return compare(datePart(candidate), until as PlainDate) > 0;
  }
  if (zoned && (until as { timeZone?: string }).timeZone !== undefined) {
    return (
      toInstant(toZoned(candidate, timeZone)) >
      toInstant(until as ZonedDateTime)
    );
  }
  return compare(candidate, until as PlainDateTime) > 0;
}

function firstPeriodIndex(
  rule: RRule,
  startDate: PlainDate,
  target: PlainDate,
): number {
  const interval = rule.interval ?? 1;
  if (rule.freq === "DAILY") {
    return Math.floor((toEpochDay(target) - toEpochDay(startDate)) / interval);
  }
  if (rule.freq === "WEEKLY") {
    const wkst = rule.wkst ?? DEFAULT_WKST;
    const from = startOfWeek(startDate, wkst);
    const to = startOfWeek(target, wkst);
    return Math.floor((toEpochDay(to) - toEpochDay(from)) / (7 * interval));
  }
  if (rule.freq === "MONTHLY") {
    const from = startDate.year * 12 + (startDate.month - 1);
    const to = target.year * 12 + (target.month - 1);
    return Math.floor((to - from) / interval);
  }
  return Math.floor((target.year - startDate.year) / interval);
}

/**
 * Expand a parsed rule inside `range` (plan 12 RR4/RR5). DTSTART is always the
 * first occurrence and counts toward COUNT. Occurrences keep DTSTART's wall
 * time; zoned series resolve it through `toZoned(..., "compatible")`.
 */
export function expandRule(
  rule: RRule,
  options: ExpandRuleOptions,
): RuleOccurrence[] {
  const { start, allDay, timeZone, zoned, range } = options;
  const startDate = datePart(start);
  const rangeStart = plainDateTime(datePartOf(range.start), {
    hour: 0,
    minute: 0,
    second: 0,
  });
  const rangeEnd = plainDateTime(datePartOf(range.end), {
    hour: 23,
    minute: 59,
    second: 59,
  });
  const rangeEndDay = toEpochDay(range.end);
  const lookbackDays = allDay
    ? options.durationDays
    : Math.ceil(options.durationSeconds / SECONDS_PER_DAY);
  // Periods before this cannot reach the range, even for a multi-day occurrence.
  const windowStart = addDays(datePartOf(range.start), -(lookbackDays + 1));
  const dates = new Map<number, RuleOccurrence>();
  const seen = new Set<number>();
  let generated = 0;

  const resolve = (candidate: PlainDateTime): PlainDateTime => {
    if (!zoned) {
      return candidate;
    }
    const resolved = toZoned(candidate, timeZone, "compatible");
    return plainDateTime(
      plainDate(resolved.year, resolved.month, resolved.day),
      { hour: resolved.hour, minute: resolved.minute, second: resolved.second },
    );
  };

  const overlaps = (occurrence: RuleOccurrence): boolean => {
    if (compare(occurrence.start, occurrence.end) === 0) {
      return (
        compare(occurrence.start, rangeStart) >= 0 &&
        compare(occurrence.start, rangeEnd) <= 0
      );
    }
    return (
      compare(occurrence.start, rangeEnd) <= 0 &&
      compare(occurrence.end, rangeStart) > 0
    );
  };

  const add = (candidate: PlainDateTime, force = false): boolean => {
    const key = wallSeconds(candidate);
    if (seen.has(key)) {
      return true;
    }
    if (!force) {
      if (rule.count !== undefined && generated >= rule.count) {
        return false;
      }
      if (pastUntil(candidate, rule, timeZone, zoned)) {
        return false;
      }
    }
    seen.add(key);
    generated += 1;
    const occurrenceStart = resolve(candidate);
    const occurrenceEnd = allDay
      ? plainDateTime(addDays(occurrenceStart, options.durationDays), {
          hour: 0,
          minute: 0,
          second: 0,
        })
      : fromWallSeconds(wallSeconds(occurrenceStart) + options.durationSeconds);
    const occurrence = {
      start: occurrenceStart,
      end: occurrenceEnd,
      allDay,
    };
    if (overlaps(occurrence)) {
      dates.set(key, occurrence);
    }
    return true;
  };

  add(start, true);
  if (rule.count !== undefined && generated >= rule.count) {
    return [...dates.values()];
  }

  const jumpTo =
    rule.count === undefined
      ? Math.max(0, firstPeriodIndex(rule, startDate, windowStart) - 1)
      : 0;

  for (let step = jumpTo; step <= ITERATION_CAP + jumpTo; step += 1) {
    const iterations = step - jumpTo + 1;
    if (iterations > ITERATION_CAP) {
      options.onError?.(
        rruleError(
          "iteration-cap",
          `The rule needed more than ${ITERATION_CAP} periods; expansion stopped.`,
          "FREQ",
        ),
      );
      break;
    }
    const period = periodOf(rule, startDate, step);
    if (toEpochDay(period.anchor) > rangeEndDay + 1) {
      break;
    }
    for (const date of period.dates) {
      const candidate = plainDateTime(date, timePart(start));
      if (compare(candidate, start) < 0) {
        continue;
      }
      if (!add(candidate)) {
        return [...dates.values()];
      }
    }
    if (rule.count !== undefined && generated >= rule.count) {
      break;
    }
  }
  return [...dates.values()].sort((a, b) => compare(a.start, b.start));
}
