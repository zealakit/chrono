import {
  type DateInput,
  type DateRange,
  type DateTimeInput,
  type PlainDate,
  type PlainDateTime,
  addDays,
  compare,
  plainDateTime,
  toEpochDay,
  toIsoString,
} from "../../foundation/index.js";
import {
  normalizeEventInput,
  normalizeEvents,
  warnOnce,
} from "../events/normalize.js";
import type { CalendarEventInput, NormalizedEvent } from "../events/types.js";
import {
  expandRecurrence,
  overrideInfo,
  overrideOf,
  recurrenceWall,
} from "./series.js";
import type {
  RecurrenceErrorHandler,
  RecurrenceOccurrence,
  RecurrencePack,
} from "./types.js";

const CACHE_LIMIT = 500;
const cache = new Map<string, RecurrenceOccurrence<CalendarEventInput>[]>();
/** Once per series object and error code (plan 12 R5). */
const reported = new WeakMap<object, Set<string>>();

type SeriesShape = CalendarEventInput & {
  rrule: string | object;
  exdates?: readonly (DateTimeInput | DateInput)[];
  rdates?: readonly (DateTimeInput | DateInput)[];
};
type OverrideShape = CalendarEventInput & {
  recurringId?: string | number;
  recurrenceId?: DateTimeInput | DateInput;
};

function report<T extends CalendarEventInput>(
  event: T,
  onError: RecurrenceErrorHandler | undefined,
  error: { code: string },
): void {
  let codes = reported.get(event);
  if (!codes) {
    codes = new Set();
    reported.set(event, codes);
  }
  if (codes.has(error.code)) {
    return;
  }
  codes.add(error.code);
  onError?.(event, error as Parameters<RecurrenceErrorHandler>[1]);
}

function cacheSet(
  key: string,
  value: RecurrenceOccurrence<CalendarEventInput>[],
): void {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const first = cache.keys().next().value;
    if (first !== undefined) {
      cache.delete(first);
    }
  }
}

function overlaps(
  start: PlainDateTime,
  end: PlainDateTime,
  range: DateRange,
): boolean {
  const from = plainDateTime(range.start, {
    hour: 0,
    minute: 0,
    second: 0,
  });
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

/** Widen the expansion so overrides can be matched wherever they sit. */
function bounds(
  visibleRange: DateRange,
  overrides: readonly PlainDateTime[],
): DateRange {
  let start = visibleRange.start;
  let end = visibleRange.end;
  for (const occurrence of overrides) {
    const date: PlainDate = {
      calendar: "gregory",
      year: occurrence.year,
      month: occurrence.month,
      day: occurrence.day,
    };
    if (toEpochDay(date) < toEpochDay(start)) {
      start = addDays(date, -1);
    }
    if (toEpochDay(date) > toEpochDay(end)) {
      end = date;
    }
  }
  return { start, end };
}

function valueKey(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Expand series and resolve overrides for normalization (plan 12 RR2/RR6).
 * Without this pack, `normalizeEvents` shows an event with `rrule` once.
 */
function expand<T extends CalendarEventInput>(
  events: readonly T[],
  options: {
    visibleRange: DateRange;
    timeZone: string;
    onRecurrenceError?: RecurrenceErrorHandler;
  },
): RecurrenceOccurrence<T>[] {
  const { visibleRange, timeZone, onRecurrenceError } = options;
  const series: T[] = [];
  const overrides: T[] = [];
  const plain: T[] = [];

  for (const event of events) {
    if (overrideOf(event, timeZone)) {
      overrides.push(event);
    } else if (event.rrule !== undefined) {
      series.push(event);
    } else {
      plain.push(event);
    }
  }

  const parsed = new Map<T, NormalizedEvent<T>>();
  const overrideStarts = new Map<T, PlainDateTime>();
  const seriesById = new Map<string, T>();

  for (const value of series) {
    parsed.set(value, normalizeEventInput(value, timeZone));
    seriesById.set(String(value.id), value);
  }
  for (const value of overrides) {
    parsed.set(value, normalizeEventInput(value, timeZone));
    const override = overrideOf(value, timeZone);
    if (override) {
      overrideStarts.set(value, override.occurrenceStart);
    }
  }

  const overridesBySeries = new Map<
    string,
    { event: T; start: PlainDateTime }[]
  >();
  for (const event of overrides) {
    const override = overrideOf(event, timeZone);
    if (!override) {
      continue;
    }
    const key = String(override.recurringId);
    const list = overridesBySeries.get(key) ?? [];
    list.push({ event, start: override.occurrenceStart });
    overridesBySeries.set(key, list);
  }

  const output = new Map<T, RecurrenceOccurrence<T>[]>();
  const matched = new Set<T>();

  for (const value of series) {
    const shape = value as T & SeriesShape;
    const own = overridesBySeries.get(String(value.id)) ?? [];
    const range = bounds(
      visibleRange,
      own.map((entry) => entry.start),
    );
    const parsedSeries = parsed.get(value) as NormalizedEvent<T>;
    const exdates = new Set(
      (shape.exdates ?? []).map((exdate) =>
        toIsoString(recurrenceWall(exdate, parsedSeries.allDay, timeZone)),
      ),
    );
    const key = [
      String(value.id),
      valueKey(shape.rrule),
      toIsoString(parsedSeries.start),
      toIsoString(parsedSeries.end),
      parsedSeries.allDay ? "d" : "",
      timeZone,
      toIsoString(range.start),
      toIsoString(range.end),
      (shape.exdates ?? []).map(valueKey).join(","),
      (shape.rdates ?? []).map(valueKey).join(","),
    ].join("|");
    let cached = cache.get(key) as
      | RecurrenceOccurrence<CalendarEventInput>[]
      | undefined;
    if (!cached) {
      cached = expandRecurrence(value, range, {
        timeZone,
        onError: (error) => report(value, onRecurrenceError, error),
      }) as RecurrenceOccurrence<CalendarEventInput>[];
      cacheSet(key, cached);
    }
    const occurrences = cached.map((occurrence) => ({
      ...occurrence,
      event: value,
      recurrence: occurrence.recurrence
        ? { ...occurrence.recurrence, series: value }
        : undefined,
    })) as RecurrenceOccurrence<T>[];

    const byStart = new Map<string, T>();
    for (const entry of own) {
      byStart.set(toIsoString(entry.start), entry.event);
    }
    const list: RecurrenceOccurrence<T>[] = [];
    for (const occurrence of occurrences) {
      const occurrenceKey = toIsoString(occurrence.start);
      const override = byStart.get(occurrenceKey);
      if (override) {
        matched.add(override);
        const info = parsed.get(override) as NormalizedEvent<T>;
        if (overlaps(info.start, info.end, visibleRange)) {
          list.push({
            event: override,
            start: info.start,
            end: info.end,
            allDay: info.allDay,
            key: `${String(value.id)}:${occurrenceKey}`,
            recurrence: overrideInfo(value, occurrence.start),
          });
        }
      } else if (overlaps(occurrence.start, occurrence.end, visibleRange)) {
        list.push(occurrence);
      }
    }
    output.set(value, list);

    for (const entry of own) {
      if (matched.has(entry.event)) {
        continue;
      }
      const occurrenceKey = toIsoString(entry.start);
      warnOnce(
        exdates.has(occurrenceKey)
          ? `[chrono] Override "${String(entry.event.id)}" targets an excluded occurrence; ignored.`
          : `[chrono] Override "${String(entry.event.id)}" does not match an occurrence; ignored.`,
      );
    }
  }

  const plainNormalized = normalizeEvents(plain, {
    visibleRange,
    timeZone,
  }) as unknown as RecurrenceOccurrence<T>[];
  const plainByEvent = new Map<T, RecurrenceOccurrence<T>[]>();
  for (const occurrence of plainNormalized) {
    const list = plainByEvent.get(occurrence.event) ?? [];
    list.push(occurrence);
    plainByEvent.set(occurrence.event, list);
  }

  const orphans = new Map<T, RecurrenceOccurrence<T>>();
  for (const event of overrides) {
    const shape = event as T & OverrideShape;
    if (
      matched.has(event) ||
      (shape.recurringId !== undefined &&
        seriesById.has(String(shape.recurringId)))
    ) {
      continue;
    }
    const info = parsed.get(event) as NormalizedEvent<T>;
    if (!overlaps(info.start, info.end, visibleRange)) {
      continue;
    }
    // Pre-expanded data may carry an override without its series.
    orphans.set(event, {
      event,
      start: info.start,
      end: info.end,
      allDay: info.allDay,
      key: info.key,
      recurrence: {
        recurringId: shape.recurringId as string | number,
        occurrenceStart: overrideStarts.get(event) as PlainDateTime,
        isOverride: true,
        series: event,
      },
    });
  }

  const result: RecurrenceOccurrence<T>[] = [];
  for (const event of events) {
    const seriesOutput = output.get(event);
    if (seriesOutput) {
      result.push(...seriesOutput);
      continue;
    }
    const orphan = orphans.get(event);
    if (orphan) {
      result.push(orphan);
      continue;
    }
    const list = plainByEvent.get(event);
    if (list) {
      result.push(...list);
    }
  }
  return result;
}

/** The opt-in recurrence pack (plan 12 RR2). */
export const recurrence: RecurrencePack = { expand };
